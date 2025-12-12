export const cleanupTempOrders = async (req, res, next) => {
    try {
        // Clean up session temp data older than 30 minutes
        if (req.session.tempOrderData && req.session.tempOrderData.createdAt) {
            const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
            if (req.session.tempOrderData.createdAt < thirtyMinutesAgo) {
                delete req.session.tempOrderData;
            }
        }
        next();
    } catch (err) {
        next(err);
    }
}