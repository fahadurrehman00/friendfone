var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var AdminSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
    password: String,
    image: String,
	imageId: String,
    firstName: String,
    lastName: String,
    email: {type: String, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: true},


});



AdminSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Admin", AdminSchema);