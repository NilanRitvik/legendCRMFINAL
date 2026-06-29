import dbConnect from '@/lib/dbConnect';
import { Project, BOQ, ProjectMilestone, WarrantyRegistry, MaterialStock, Settings } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

const GEMINI_MODEL = 'gemini-2.5-flash';

// Get all studio data (Projects, BOQs, Milestones, Warranty list)
export async function GET(request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    const filter = projectId ? { project: projectId } : {};
    
    // Fetch datasets
    const projects = await Project.find({ status: { $ne: 'cancelled' } }).populate('client').sort({ createdAt: -1 });
    const boqs = await BOQ.find(filter).populate('project').lean();
    const milestones = await ProjectMilestone.find(filter).populate('project').sort({ start_date: 1 }).lean();
    const warranties = await WarrantyRegistry.find(filter).populate('project').sort({ end_date: 1 }).lean();
    const materials = await MaterialStock.find({}).sort({ name: 1 }).lean();

    return Response.json({
      projects,
      boqs,
      milestones,
      warranties,
      materials
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add or save BOQ, Milestones, Warranties, or run AI Suggest
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return Response.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    // Parse user details from session cookie
    let username = 'System';
    let user_role = 'admin';
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const sessionCookie = cookieHeader.split('; ').find(row => row.startsWith('legendin_session='));
      if (sessionCookie) {
        const val = sessionCookie.split('=')[1];
        const decoded = Buffer.from(val, 'base64').toString('utf-8');
        const data = JSON.parse(decoded);
        username = data.username || 'System';
        user_role = data.role || 'admin';
      }
    } catch (e) {}

    // ─── 1. AI PALETTE SUGGESTIONS ───
    if (action === 'ai_suggest') {
      const { theme, colors, room_type } = body;
      if (!theme || !room_type) {
        return Response.json({ error: 'Theme and room type are required' }, { status: 400 });
      }

      // Fetch key override from MongoDB settings, fallback to env keys
      let apiOverride = '';
      try {
        const customSetting = await Settings.findOne({ key: 'gemini_api_key' }).lean();
        if (customSetting && customSetting.value?.trim()) {
          apiOverride = customSetting.value.trim();
        }
      } catch {}

      const apiKey = apiOverride || process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2;
      if (!apiKey) {
        return Response.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
      }

      const prompt = `You are a high-end luxury interior designer and architect.
Provide design suggestions, material palettes, laminate options, and moodboard recommendations for a ${room_type} based on the theme "${theme}" and preferred colors "${colors || 'Designer discretion'}".

Format your response in neat, readable sections:
1. DESIGN BRIEF: A paragraph summarizing the aesthetic concept.
2. MATERIAL SUITE & TEXTURES: Suggest laminates, veneers, finishes, stones, and flooring textures.
3. ACCENT HIGHLIGHTS: Accent lighting, hardware finishes, fabric options.
4. ESTIMATED MATERIAL STOCK MATCHING: Suggest rough stock classifications needed (e.g. 19mm Plywood, Charcoal Louvers, MDF boards, veneer sheets).

Be brief and highly professional. Avoid placeholders.`;

      // Call Google API
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      if (!geminiRes.ok) {
        const errData = await geminiRes.json();
        return Response.json({ error: errData.error?.message || 'Gemini API call failed.' }, { status: geminiRes.status });
      }

      const resJson = await geminiRes.json();
      const aiReply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions could be generated.';

      return Response.json({ reply: aiReply });
    }

    // ─── 2. SAVE OR UPDATE BOQ ───
    if (action === 'save_boq') {
      const { project, rooms, grand_total, status } = body;
      if (!project || !rooms) {
        return Response.json({ error: 'Project and rooms data are required' }, { status: 400 });
      }

      const boq = await BOQ.findOneAndUpdate(
        { project },
        { project, rooms, grand_total: Number(grand_total) || 0, status: status || 'draft' },
        { upsert: true, new: true }
      );

      await logActivity({
        username,
        user_role,
        action_type: 'update',
        module: 'projects',
        description: `Saved Bill of Quantities (BOQ) with total value ₹${(Number(grand_total) || 0).toLocaleString()}`,
        ref_id: boq._id.toString(),
        ref_name: 'BOQ'
      });

      return Response.json({ success: true, boq }, { status: 201 });
    }

    // ─── 3. SAVE MILESTONE ───
    if (action === 'add_milestone') {
      const { project, title, phase, start_date, end_date, progress, status, notes } = body;
      if (!project || !title || !phase || !start_date || !end_date) {
        return Response.json({ error: 'Missing required milestone fields' }, { status: 400 });
      }

      const milestone = await ProjectMilestone.create({
        project,
        title,
        phase,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        progress: Number(progress) || 0,
        status: status || 'pending',
        notes
      });

      return Response.json({ success: true, milestone }, { status: 201 });
    }

    // ─── 4. SAVE WARRANTY ───
    if (action === 'add_warranty') {
      const { project, item_name, brand, serial_number, warranty_years, start_date, notes } = body;
      if (!project || !item_name || !brand || !warranty_years || !start_date) {
        return Response.json({ error: 'Missing required warranty fields' }, { status: 400 });
      }

      const yrs = Number(warranty_years) || 1;
      const sDate = new Date(start_date);
      const eDate = new Date(sDate);
      eDate.setFullYear(sDate.getFullYear() + yrs);

      const warranty = await WarrantyRegistry.create({
        project,
        item_name,
        brand,
        serial_number,
        warranty_years: yrs,
        start_date: sDate,
        end_date: eDate,
        status: 'active',
        notes
      });

      return Response.json({ success: true, warranty }, { status: 201 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update progress on Gantt Milestones or Warranty Status
export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 });
    }

    if (action === 'update_milestone') {
      const { progress, status, notes } = body;
      const milestone = await ProjectMilestone.findById(id);
      if (!milestone) return Response.json({ error: 'Milestone not found' }, { status: 404 });

      if (progress !== undefined) milestone.progress = Number(progress);
      if (status) milestone.status = status;
      if (notes !== undefined) milestone.notes = notes;

      await milestone.save();
      return Response.json({ success: true, milestone });
    }

    if (action === 'update_warranty') {
      const { status } = body;
      const warranty = await WarrantyRegistry.findById(id);
      if (!warranty) return Response.json({ error: 'Warranty record not found' }, { status: 404 });

      if (status) warranty.status = status;
      await warranty.save();
      return Response.json({ success: true, warranty });
    }

    return Response.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove milestones or warranty entries
export async function DELETE(request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');

    if (!id || !type) {
      return Response.json({ error: 'ID and type parameters are required' }, { status: 400 });
    }

    if (type === 'milestone') {
      await ProjectMilestone.findByIdAndDelete(id);
    } else if (type === 'warranty') {
      await WarrantyRegistry.findByIdAndDelete(id);
    } else {
      return Response.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
