var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	pin: String,
	timeZone: String,
	streetAddress: String,
	secondAddress: String,
	city: String,
	state: String,
	zipCode: Number,
    password: String,
	schoolPhone: String,
	friendPhone: String,
    image: String,
	imageId: String,
    firstName: String,
    lastName: String,
    directLine: String,
    pointOfContact: String,
	purpose: String,
	promoCode: String,
    email: String,
	emailToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isHospitality: {type: Boolean, default: false},
    isAdmin: {type: Boolean, default: false},
	//EC1
	ec1firstName: String,
	ec1lastName: String,
	ec1email : String,
	ec1phoneNumber: String,
	ec1Relation: String,
	ec1streetAdress: String,
	ec1secondary: String,
	ec1city: String,
	ec1state: String,
	ec1zipCode: String,
	
	//EC2
	ec2firstName: String,
	ec2lastName: String,
	ec2email: String,
	ec2phoneNumber: String,
	ec2Relation: String,
	ec2streetAdress: String,
	ec2secondary: String,
	ec2city: String,
	ec2state: String,
	ec2zipCode: String,
	notes:[
		{
			type: mongoose.Schema.Types.ObjectID,
			ref: "Note"
		}
	],

	// Ban
	banned: {type: Boolean, default: false},
	banReason: String,

});



UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);