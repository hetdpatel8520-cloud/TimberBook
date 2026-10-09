const Item = require('../models/Item');
const StockMovement = require('../models/StockMovement');

async function getItems(req, res, next) {
  try {
    const { group, search, lowStock } = req.query;
    let query = { companyId: req.companyId, isActive: true };

    if (group) {
      query.group = group;
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { hsn: regex },
        { group: regex }
      ];
    }

    const items = await Item.find(query).sort({ name: 1 });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    next(err);
  }
}

async function getItemById(req, res, next) {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const movements = await StockMovement.find({ companyId: req.companyId, itemId: item._id })
      .sort({ date: -1 })
      .limit(20);

    res.json({ success: true, item, stockMovements: movements });
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const {
      name,
      hsn = '4407',
      group = 'Sawn Timber',
      unit = 'CFT',
      cgstRate = 9,
      sgstRate = 9,
      igstRate = 18,
      saleRate = 0,
      purchaseRate = 0,
      openingQty = 0,
      reorderLevel = 50
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const openQty = parseFloat(openingQty) || 0;

    const item = await Item.create({
      companyId: req.companyId,
      name: name.trim(),
      hsn: (hsn || '4407').trim(),
      group,
      unit,
      cgstRate: Number(cgstRate) || 9,
      sgstRate: Number(sgstRate) || 9,
      igstRate: Number(igstRate) || 18,
      saleRate: parseFloat(saleRate) || 0,
      purchaseRate: parseFloat(purchaseRate) || 0,
      openingQty: openQty,
      currentStock: openQty,
      reorderLevel: parseFloat(reorderLevel) || 50
    });

    if (openQty > 0) {
      await StockMovement.create({
        companyId: req.companyId,
        itemId: item._id,
        itemName: item.name,
        date: new Date(),
        refType: 'Opening',
        qtyIn: openQty,
        balanceAfter: openQty,
        unit: item.unit,
        rate: item.purchaseRate,
        notes: 'Opening Stock Balance'
      });
    }

    res.status(201).json({ success: true, message: 'Item created successfully.', item });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const fields = [
      'name', 'hsn', 'group', 'unit', 'cgstRate', 'sgstRate', 'igstRate',
      'saleRate', 'purchaseRate', 'reorderLevel', 'isActive'
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });

    await item.save();
    res.json({ success: true, message: 'Item updated successfully.', item });
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const hasMovement = await StockMovement.exists({ companyId: req.companyId, itemId: item._id, refType: { $ne: 'Opening' } });
    if (hasMovement) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item with transaction history. Deactivate it instead.'
      });
    }

    await Item.findByIdAndDelete(item._id);
    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};
