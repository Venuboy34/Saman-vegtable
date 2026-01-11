// ============================================
// FILE: api/sales.js
// ============================================
const clientPromise = require('../lib/mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('samanShop');
    const bills = db.collection('bills');

    const { date } = req.query;

    // Default to today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Aggregate sales data
    const salesData = await bills.aggregate([
      {
        $match: {
          createdAt: { $gte: targetDate, $lt: nextDay }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          billCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const result = salesData[0] || { totalSales: 0, billCount: 0 };

    return res.status(200).json({
      date: targetDate.toISOString().split('T')[0],
      totalSales: result.totalSales,
      billCount: result.billCount
    });

  } catch (error) {
    console.error('Sales API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
