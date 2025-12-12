// ExchangeRate model removed. Kept placeholder to avoid module-not-found errors during rollback.
import mongoose from 'mongoose';

const ExchangeRateSchema = new mongoose.Schema({
	fromCode: { type: String, required: true, index: true },
	toCode: { type: String, required: true, index: true },
	buyingPrice: { type: Number, default: null },
	sellingPrice: { type: Number, default: null },
	priceType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
	meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.model('ExchangeRate', ExchangeRateSchema);
