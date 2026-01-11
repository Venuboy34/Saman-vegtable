const clientPromise = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await clientPromise;
    const db = client.db('samanShop');
    const products = db.collection('products');

    // GET: Fetch all products
    if (req.method === 'GET') {
      const allProducts = await products.find({}).sort({ name: 1 }).toArray();
      return res.status(200).json(allProducts);
    }

    // POST: Add new product
    if (req.method === 'POST') {
      const { name, price, type } = req.body;
      
      if (!name || !price || !type) {
        return res.status(400).json({ error: 'Name, price, and type are required' });
      }

      if (!['weight', 'piece'].includes(type)) {
        return res.status(400).json({ error: 'Type must be "weight" or "piece"' });
      }

      // Check if product already exists
      const existing = await products.findOne({ name });
      if (existing) {
        return res.status(400).json({ error: 'Product already exists' });
      }

      const result = await products.insertOne({
        name: name.trim(),
        price: parseFloat(price),
        type,
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        id: result.insertedId
      });
    }

    // PUT: Update product (flexible - can update any field)
    if (req.method === 'PUT') {
      const { id, name, price, type } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Build update object dynamically based on what fields are provided
      const updateFields = {};
      
      if (name !== undefined && name !== null && name.trim() !== '') {
        updateFields.name = name.trim();
      }
      
      if (price !== undefined && price !== null) {
        updateFields.price = parseFloat(price);
      }
      
      if (type !== undefined && type !== null) {
        if (!['weight', 'piece'].includes(type)) {
          return res.status(400).json({ error: 'Type must be "weight" or "piece"' });
        }
        updateFields.type = type;
      }

      // Check if there's anything to update
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Add updatedAt timestamp
      updateFields.updatedAt = new Date();

      const result = await products.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ 
        success: true,
        updated: updateFields 
      });
    }

    // DELETE: Remove product
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Product ID required' });
      }

      const result = await products.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Products API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
