import dbConnect from '@/lib/dbConnect';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('retry') === 'true') {
      // Reset the cache in-place so closures referencing global.mongoose see it
      global.isDemoMode = false;
      global.isDemoModeEnabled = false;
      global.dbError = null;
      if (global.mongoose) {
        global.mongoose.conn = null;
        global.mongoose.promise = null;
      }
    }
    
    await dbConnect();
    
    return Response.json({
      status: global.isDemoMode ? 'demo' : 'connected',
      error: global.dbError || null
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message
    });
  }
}
