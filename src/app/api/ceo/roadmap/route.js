import dbConnect from '@/lib/dbConnect';
import { Client, Quotation, Project, Invoice, Payment, MaterialTransaction, Installation, Design, Employee, Manufacturing, QC, Logistics, Expense } from '@/lib/models';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client');
    const projectId = searchParams.get('project');

    // 1. Fetch all clients and projects for the dropdown selector
    const clients = await Client.find({}).sort({ name: 1 });
    const allProjects = await Project.find({}).populate('client').sort({ createdAt: -1 });
    const allInvoices = await Invoice.find({});

    const projectsList = allProjects.map(proj => {
      const projInvoices = allInvoices.filter(inv => inv.project?.toString() === proj._id.toString());
      return {
        _id: proj._id,
        name: proj.name,
        company: proj.client?.company || 'N/A',
        clientName: proj.client?.name || 'N/A',
        phone: proj.client?.phone || '',
        invoices: projInvoices.map(inv => inv.invoice_number)
      };
    });

    let clientRoadmap = null;
    let selectedClient = null;
    let selectedProject = null;

    if (projectId) {
      selectedProject = await Project.findById(projectId).populate('client').populate('quotation');
      if (selectedProject) {
        selectedClient = selectedProject.client;
      }
    } else if (clientId) {
      selectedClient = await Client.findById(clientId);
      if (selectedClient) {
        selectedProject = await Project.findOne({ client: clientId }).populate('client').populate('quotation');
      }
    }

    if (selectedClient) {
      const finalProjectId = selectedProject ? selectedProject._id : null;

      // Fetch all related entities
      const quotations = await Quotation.find({ client: selectedClient._id }).sort({ createdAt: 1 });
      const invoices = finalProjectId ? await Invoice.find({ project: finalProjectId }).sort({ createdAt: 1 }) : [];
      const payments = finalProjectId ? await Payment.find({ project: finalProjectId }).sort({ createdAt: 1 }) : [];
      const materialIssues = finalProjectId ? await MaterialTransaction.find({ 
        project: finalProjectId,
        transaction_type: 'issue'
      }).sort({ date: 1 }) : [];
      
      const designs = await Design.find({ client: selectedClient._id }).sort({ createdAt: 1 });
      const installations = finalProjectId ? await Installation.find({ project: finalProjectId }).sort({ createdAt: 1 }) : [];
      
      // Fetch new workflows
      const manufacturing = finalProjectId ? await Manufacturing.find({ project: finalProjectId }).sort({ createdAt: 1 }) : [];
      const qcList = finalProjectId ? await QC.find({ project: finalProjectId }).sort({ createdAt: 1 }) : [];
      const logistics = finalProjectId ? await Logistics.find({ project: finalProjectId }).sort({ createdAt: 1 }) : [];
      const projectExpenses = finalProjectId ? await Expense.find({ project: finalProjectId }) : [];

      // Build roadmap stages
      const stages = [];

      // Stage 1: Lead & Contact
      stages.push({
        id: 'lead',
        title: 'Lead & Contact',
        status: 'completed',
        description: `Client added as ${selectedClient.source || 'lead'}. Approx value: ₹${(selectedClient.approx_value || 0).toLocaleString()}.`,
        date: selectedClient.createdAt,
        processedBy: selectedClient.created_by || 'Sales Team',
        processedByRole: 'Lead Capture',
        notes: selectedClient.notes || ''
      });

      // Stage 2: Quotations
      if (quotations.length > 0) {
        const accepted = quotations.filter(q => q.status === 'accepted');
        const pending = quotations.filter(q => q.status === 'pending');
        
        let status = 'completed';
        let desc = `Sent ${quotations.length} quotation(s).`;
        if (accepted.length > 0) {
          desc += ` Accepted: ${accepted.map(q => q.quotation_number || 'QN').join(', ')}.`;
        } else if (pending.length > 0) {
          status = 'in_progress';
          desc += ` Pending client approval: ${pending.map(q => q.quotation_number || 'QN').join(', ')}.`;
        } else {
          status = 'failed';
          desc += ' Rejected or status outstanding.';
        }

        stages.push({
          id: 'quotation',
          title: 'Quotations Sent',
          status,
          description: desc,
          date: quotations[quotations.length - 1].createdAt,
          processedBy: quotations[quotations.length - 1].created_by || 'Sales / Estimation',
          processedByRole: 'Quotation Manager',
          notes: quotations[quotations.length - 1].notes || ''
        });
      } else {
        stages.push({
          id: 'quotation',
          title: 'Quotations Sent',
          status: 'pending',
          description: 'No quotations sent yet.'
        });
      }

      // Stage 3: Project Invoicing
      if (invoices.length > 0) {
        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
        
        let status = 'in_progress';
        let desc = `Invoiced ₹${totalInvoiced.toLocaleString()} across ${invoices.length} bill(s).`;
        if (paidInvoices.length === invoices.length) {
          status = 'completed';
          desc += ' All invoices paid.';
        } else {
          desc += ` ${paidInvoices.length} paid, ${unpaidInvoices.length} unpaid/pending.`;
        }

        stages.push({
          id: 'invoicing',
          title: 'Project Invoicing',
          status,
          description: desc,
          date: invoices[invoices.length - 1].createdAt,
          processedBy: invoices[invoices.length - 1].created_by || 'Finance Team',
          processedByRole: 'Finance / Billing',
          notes: `Total invoiced: \u20b9${totalInvoiced.toLocaleString()}. ${paidInvoices.length} of ${invoices.length} invoices paid.`
        });
      } else {
        stages.push({
          id: 'invoicing',
          title: 'Project Invoicing',
          status: selectedProject ? 'in_progress' : 'pending',
          description: 'No project invoices raised yet.'
        });
      }

      // Stage 4: Purchase & Stock Approval
      const pendingPurchasesCount = await MaterialTransaction.countDocuments({ transaction_type: 'purchase', approval_status: 'pending' });
      const latestPurchase = await MaterialTransaction.findOne({ transaction_type: 'purchase', project: finalProjectId }).sort({ date: -1 });
      stages.push({
        id: 'purchase',
        title: 'Material Purchase',
        status: pendingPurchasesCount > 0 ? 'in_progress' : 'completed',
        description: pendingPurchasesCount > 0 
          ? `${pendingPurchasesCount} stock purchases are pending CEO finance approval.`
          : 'All log purchases and stock inputs are cleared.',
        date: latestPurchase?.date || null,
        processedBy: latestPurchase?.created_by || 'Procurement Team',
        processedByRole: 'Stock / Purchase',
        notes: latestPurchase ? `Last item: ${latestPurchase.material_name}, Qty: ${latestPurchase.quantity}` : ''
      });

      // Stage 5: Material Issue (Stock Log)
      if (materialIssues.length > 0) {
        const totalQty = materialIssues.reduce((sum, t) => sum + t.quantity, 0);
        const pendingAllocations = await MaterialTransaction.countDocuments({ project: finalProjectId, transaction_type: 'issue', approval_status: 'pending' });
        
        stages.push({
          id: 'material_issue',
          title: 'Material Issue',
          status: pendingAllocations > 0 ? 'in_progress' : 'completed',
          description: pendingAllocations > 0 
            ? `Allocated ${totalQty} items. ${pendingAllocations} items pending CEO approval.`
            : `Allocated ${totalQty} items to work site. All approved.`,
          date: materialIssues[materialIssues.length - 1].date,
          processedBy: materialIssues[materialIssues.length - 1].created_by || 'Stock Team',
          processedByRole: 'Material Issue / Store',
          notes: `${materialIssues.length} issue transaction(s). Latest: ${materialIssues[materialIssues.length - 1].material_name}.`
        });
      } else {
        stages.push({
          id: 'material_issue',
          title: 'Material Issue',
          status: selectedProject ? 'in_progress' : 'pending',
          description: 'No materials issued to project site yet.'
        });
      }

      // Stage 6: Manufacturing & Production
      if (manufacturing.length > 0) {
        const scheduled = manufacturing.filter(m => m.status === 'scheduled');
        const inProgress = manufacturing.filter(m => m.status === 'in_progress');
        const finishedPending = manufacturing.filter(m => m.status === 'finished' && m.approval_status === 'pending');
        const finishedApproved = manufacturing.filter(m => m.status === 'finished' && m.approval_status === 'approved');

        let status = 'in_progress';
        let desc = `Manufacturing runs: ${manufacturing.length} job(s). `;
        if (finishedApproved.length === manufacturing.length) {
          status = 'completed';
          desc += 'All items finished & cleared by CEO.';
        } else if (finishedPending.length > 0) {
          status = 'pending';
          desc += `${finishedPending.length} run(s) finished, pending CEO sign-off.`;
        } else if (inProgress.length > 0) {
          desc += `${inProgress.length} run(s) currently in progress on factory floor.`;
        } else if (scheduled.length > 0) {
          desc += `${scheduled.length} run(s) scheduled.`;
        }

        stages.push({
          id: 'manufacturing',
          title: 'Manufacturing & Production',
          status,
          description: desc,
          date: manufacturing[manufacturing.length - 1].updatedAt,
          processedBy: manufacturing[manufacturing.length - 1].created_by || 'Production Team',
          processedByRole: 'Manufacturing / Workshop',
          notes: `${manufacturing.length} job run(s). Status: ${manufacturing[manufacturing.length - 1].status}.`
        });
      } else {
        stages.push({
          id: 'manufacturing',
          title: 'Manufacturing & Production',
          status: materialIssues.length > 0 ? 'in_progress' : 'pending',
          description: 'Awaiting stock issues to project before starting production.'
        });
      }

      // Stage 7: Quality Clearance (QC)
      if (qcList.length > 0) {
        const pendingQc = qcList.filter(q => q.approval_status === 'pending');
        const approvedQc = qcList.filter(q => q.status === 'approved' && q.approval_status === 'approved');
        const rejectedQc = qcList.filter(q => q.status === 'rejected');

        let status = 'in_progress';
        let desc = `QC testing: ${qcList.length} report(s). `;
        if (approvedQc.length === qcList.length) {
          status = 'completed';
          desc += 'All items passed quality control checks & approved by CEO.';
        } else if (pendingQc.length > 0) {
          status = 'pending';
          desc += `${pendingQc.length} test checklist(s) pending CEO approval.`;
        } else if (rejectedQc.length > 0) {
          status = 'failed';
          desc += `${rejectedQc.length} test checklist(s) failed inspection.`;
        }

        stages.push({
          id: 'qc',
          title: 'Quality Clearance (QC)',
          status,
          description: desc,
          date: qcList[qcList.length - 1].updatedAt,
          processedBy: qcList[qcList.length - 1].inspector_name || qcList[qcList.length - 1].created_by || 'QC Inspector',
          processedByRole: 'Quality Control',
          notes: qcList[qcList.length - 1].description || ''
        });
      } else {
        stages.push({
          id: 'qc',
          title: 'Quality Clearance (QC)',
          status: manufacturing.some(m => m.status === 'finished') ? 'in_progress' : 'pending',
          description: 'Awaiting production completion to inspect quality.'
        });
      }

      // Stage 8: Dispatch & Logistics
      if (logistics.length > 0) {
        const pendingLog = logistics.filter(l => l.approval_status === 'pending');
        const scheduledLog = logistics.filter(l => l.status === 'scheduled' && l.approval_status === 'approved');
        const dispatchedLog = logistics.filter(l => l.status === 'dispatched');
        const deliveredLog = logistics.filter(l => l.status === 'delivered');

        let status = 'in_progress';
        let desc = `Logistics: ${logistics.length} dispatch(es). `;
        if (deliveredLog.length === logistics.length) {
          status = 'completed';
          desc += 'All scheduled deliveries completed.';
        } else if (pendingLog.length > 0) {
          status = 'pending';
          desc += `${pendingLog.length} delivery dispatch(es) pending CEO release.`;
        } else if (dispatchedLog.length > 0) {
          desc += `${dispatchedLog.length} driver(s) dispatched / in transit.`;
        } else if (scheduledLog.length > 0) {
          desc += `${scheduledLog.length} load(s) scheduled for departure.`;
        }

        stages.push({
          id: 'logistics',
          title: 'Dispatch & Logistics',
          status,
          description: desc,
          date: logistics[logistics.length - 1].updatedAt,
          processedBy: logistics[logistics.length - 1].driver || logistics[logistics.length - 1].created_by || 'Logistics Team',
          processedByRole: 'Dispatch / Logistics',
          notes: logistics[logistics.length - 1].transport ? `Vehicle: ${logistics[logistics.length - 1].transport}. Destination: ${logistics[logistics.length - 1].site || 'N/A'}.` : ''
        });
      } else {
        stages.push({
          id: 'logistics',
          title: 'Dispatch & Logistics',
          status: qcList.some(q => q.status === 'approved') ? 'in_progress' : 'pending',
          description: 'Awaiting QA clearance before dispatching site logistics.'
        });
      }

      // Stage 9: On-Site Installation
      if (installations.length > 0) {
        const pendingApp = installations.filter(i => i.approval_status === 'pending');
        const approvedApp = installations.filter(i => i.approval_status === 'approved');
        const completedInst = installations.filter(i => i.status === 'completed');

        let status = 'in_progress';
        let desc = `Installation status: ${installations[0].status}.`;
        
        if (pendingApp.length > 0) {
          status = 'pending';
          desc = `Installation scheduled but pending CEO approval: ${pendingApp[0].location}.`;
        } else if (completedInst.length === installations.length) {
          status = 'completed';
          desc = 'Installation fully completed and approved.';
        } else {
          desc = `Installation approved and in progress at ${installations[0].location}.`;
        }

        stages.push({
          id: 'installation',
          title: 'On-Site Installation',
          status,
          description: desc,
          date: installations[installations.length - 1].createdAt,
          processedBy: installations[installations.length - 1].technician || installations[installations.length - 1].created_by || 'Site Team',
          processedByRole: 'Installation / Field Engineer',
          notes: installations[installations.length - 1].notes || `Location: ${installations[installations.length - 1].location || 'N/A'}`
        });
      } else {
        stages.push({
          id: 'installation',
          title: 'On-Site Installation',
          status: selectedProject ? 'in_progress' : 'pending',
          description: 'No site installations scheduled yet.'
        });
      }

      // Stage 10: Completion / Handover
      const isCompleted = selectedProject && selectedProject.status === 'completed';
      stages.push({
        id: 'completion',
        title: 'Project Handover',
        status: isCompleted ? 'completed' : 'pending',
        description: isCompleted ? 'Project completed, signed off and handed over!' : 'Awaiting project final completion.'
      });

      // Calculate Financials & Duration
      const projectValue = selectedProject ? selectedProject.value : (selectedClient.approx_value || 0);
      const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const totalExpenses = projectExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      let totalDays = 0;
      if (selectedProject) {
        const start = selectedProject.start_date || selectedProject.createdAt;
        const end = selectedProject.status === 'completed' && selectedProject.end_date ? selectedProject.end_date : new Date();
        const diffTime = Math.abs(end - start);
        totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      clientRoadmap = {
        clientId: selectedClient._id,
        projectId: finalProjectId,
        clientName: selectedClient.name,
        company: selectedClient.company,
        projectName: selectedProject ? selectedProject.name : 'N/A',
        stages,
        projectValue,
        totalReceived,
        totalInvoiced,
        totalExpenses,
        netProfit: projectValue - totalExpenses,
        totalDays
      };
    }

    // 4. "Wake Up" Smart Roadmap Analysis:
    // Gather all approvals requiring CEO action.
    const pendingHiring = await Employee.find({ approval_status: 'pending' }).sort({ createdAt: -1 });
    const pendingPurchases = await MaterialTransaction.find({ 
      transaction_type: 'purchase',
      approval_status: 'pending'
    }).sort({ createdAt: -1 });
    const pendingStockIssues = await MaterialTransaction.find({
      transaction_type: { $in: ['issue', 'return', 'waste'] },
      approval_status: 'pending'
    }).sort({ createdAt: -1 });
    const pendingDesigns = await Design.find({ approval_status: 'pending' }).populate('client').sort({ createdAt: -1 });
    const pendingInstallations = await Installation.find({ approval_status: 'pending' }).populate({
      path: 'project',
      populate: { path: 'client' }
    }).sort({ createdAt: -1 });
    
    const pendingManufacturing = await Manufacturing.find({ approval_status: 'pending' }).populate('project').sort({ createdAt: -1 });
    const pendingQC = await QC.find({ approval_status: 'pending' }).populate('project').sort({ createdAt: -1 });
    const pendingLogistics = await Logistics.find({ approval_status: 'pending' }).populate('project').sort({ createdAt: -1 });

    const totalApprovalsCount = 
      pendingHiring.length + 
      pendingPurchases.length + 
      pendingStockIssues.length + 
      pendingDesigns.length + 
      pendingInstallations.length +
      pendingManufacturing.length +
      pendingQC.length +
      pendingLogistics.length;

    // Generate Smart Analysis insights based on DB state
    const insights = [];
    if (totalApprovalsCount > 0) {
      insights.push(`There are ${totalApprovalsCount} pending approvals waiting for your sign-off.`);
    } else {
      insights.push(`All department check-points are cleared. No pending approvals.`);
    }

    if (pendingPurchases.length > 0) {
      const worth = pendingPurchases.reduce((sum, p) => sum + (p.quantity * (p.rate || 0)), 0);
      insights.push(`Finance: ${pendingPurchases.length} stock purchases worth ₹${worth.toLocaleString()} are pending.`);
    }
    if (pendingStockIssues.length > 0) {
      insights.push(`Stock: ${pendingStockIssues.length} material dispatches / returns are waiting for stock validation.`);
    }
    if (pendingDesigns.length > 0) {
      insights.push(`Design: ${pendingDesigns.length} 2D/3D drawing sets need approval so execution teams can start.`);
    }
    if (pendingManufacturing.length > 0) {
      insights.push(`Production: ${pendingManufacturing.length} finished manufacturing runs need CEO sign-off to enter QC.`);
    }
    if (pendingQC.length > 0) {
      insights.push(`QC Assurance: ${pendingQC.length} quality clearance checks need sign-off to schedule logistics.`);
    }
    if (pendingLogistics.length > 0) {
      insights.push(`Logistics: ${pendingLogistics.length} vehicle dispatch orders need authorization to ship.`);
    }
    if (pendingInstallations.length > 0) {
      insights.push(`Installation: ${pendingInstallations.length} project installations are blocked pending start approval.`);
    }
    if (pendingHiring.length > 0) {
      insights.push(`HR: ${pendingHiring.length} recruitments are waiting for salary/contract approvals.`);
    }

    // Add Denied Stock Team Returns to Insights
    const deniedReturns = await MaterialTransaction.find({
      transaction_type: 'return',
      stock_verified: false
    }).populate('project').sort({ updatedAt: -1 });

    deniedReturns.forEach(dr => {
      insights.push(`⚠️ Stock Team Alert: Return of ${dr.quantity}x ${dr.material_name} for project "${dr.project?.name || 'N/A'}" was DENIED by Stock Team. Reason: ${dr.stock_verify_notes || 'No description'}`);
    });

    return Response.json({
      clients,
      projectsList,
      clientRoadmap,
      selectedClient,
      smartAnalysis: {
        totalApprovalsCount,
        insights,
        pendingApprovals: {
          finance: pendingPurchases,
          stock: pendingStockIssues,
          hr: pendingHiring,
          design: pendingDesigns,
          installation: pendingInstallations,
          manufacturing: pendingManufacturing,
          qc: pendingQC,
          logistics: pendingLogistics
        }
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
