var mongoose = require('mongoose');
var CodeSchema = mongoose.Schema(
{
	codes: { type: String, require: true, unique: true },
	codeAmount: { type: Number, required: true }, // if is percent, then number must be ≤ 100, else it’s amount of discount
	
});


CodeSchema.pre('save', function (next) {
var currentDate = new Date();
this.updated_at = currentDate;
if (!this.created_at) {
this.created_at = currentDate;
}
next();
});


var Code = mongoose.model('code', CodeSchema);
module.exports = Code;