const clientPromise = require('../lib/mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await clientPromise;
    const db = client.db('samanShop');
    const bills = db.collection('bills');

    // GET: Fetch bills
    if (req.method === 'GET') {
      const { date, limit } = req.query;
      
      let query = {};
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        query.createdAt = { $gte: startDate, $lte: endDate };
      }

      const limitNum = limit ? parseInt(limit) : 50;
      const allBills = await bills
        .find(query)
        .sort({ billNumber: -1 })
        .limit(limitNum)
        .toArray();
      
      return res.status(200).json(allBills);
    }

    // POST: Create new bill
    if (req.method === 'POST') {
      const { items, total, amountPaid, balance } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items required' });
      }

      if (!total || total <= 0) {
        return res.status(400).json({ error: 'Valid total required' });
      }

      // Get last bill number
      const lastBill = await bills.findOne({}, { sort: { billNumber: -1 } });
      const billNumber = lastBill ? lastBill.billNumber + 1 : 1;

      const result = await bills.insertOne({
        billNumber,
        items,
        total: parseFloat(total),
        amountPaid: parseFloat(amountPaid) || 0,
        balance: parseFloat(balance) || 0,
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        billNumber,
        id: result.insertedId
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Bills API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
