const mongoose = require("mongoose");

const moment = require("moment");

const Unverified = require("../models/unverified");

const AppointmentSchema = new mongoose.Schema({
	appointmentName: String,
	phoneNumber: String,
	notification: Number,
	timeZone: String,
	appointmentTime: { type: Date, index: true },
	repeatAtn: Boolean,
	repeatType: Number,
	appointmentDays: [{ type: Number }],
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
	pinToken: String,
	escalation: String,
	roomNumber: String,
	guestLastname: String,
	followupTime1: String,
	followupTime2: String,
});

// function toTimeZone(appointmentTime, zone) {
// 	var format = "YYYY/MM/DD HH:mm:ss ZZ";
// 	return moment(appointmentTime, format).tz(zone);
// }

AppointmentSchema.methods.requiresNotification = function (date) {
	if (this.appointmentDays.length > 0) {
		// repeat is on
		var currentDay = moment(date).tz(this.timeZone).isoWeekday();
		console.log(currentDay);
		var isTime =
			Math.round(
				moment
					.duration(
						moment(moment(this.appointmentTime).format("HH:mm:ss"), "HH:mm:ss")
							.tz(this.timeZone)
							.utc()
							.diff(moment(moment(date).format("HH:mm:ss"), "HH:mm:ss").tz(this.timeZone).utc())
					)
					.asMinutes()
			) === this.notification;
		if (this.appointmentDays.includes(currentDay) && isTime) {
			return true;
		}

		return false;
	} else {
		// repeat is off
		return (
			Math.round(
				moment
					.duration(
						moment(this.appointmentTime).tz(this.timeZone).utc().diff(moment(date).tz(this.timeZone).utc())
					)
					.asMinutes()
			) === this.notification
		);
	}
};

AppointmentSchema.statics.sendNotifications = function (callback) {
	// now
	const searchDate = new Date();
	Appointment.find().then(function (appointments) {
		appointments = appointments.filter(function (appointment) {
			return appointment.requiresNotification(searchDate);
		});
		if (appointments.length > 0) {
			sendNotifications(appointments);
		}
	});

	async function sendNotifications(appointments) {
		appointments.forEach(async function (appointment) {
			// Load the AWS SDK for Node.js
			var AWS = require("aws-sdk");
			// Set region
			AWS.config.update({ region: "us-east-1" });

			// Create publish parameters
			var params = {
				Message: `This is a reminder for ${appointment.appointmentName}. ${process.env.WEB_LINK}/appointments/verify-pin/?token=${appointment.pinToken}` /* required */,
				PhoneNumber: process.env.COUNTRY_CODE + appointment.phoneNumber,
			};

			// Create promise and SNS service object
			var publishTextPromise = new AWS.SNS({ apiVersion: "2010-03-31" }).publish(params).promise();

			// Handle promise's fulfilled/rejected states
			publishTextPromise
				.then(function (data) {
					console.log("MessageID is " + data.MessageId);
					console.log("message is sent to the number: " + appointment.phoneNumber);
				})
				.catch(function (err) {
					console.error(err, err.stack);
				});

			var unverified = new Unverified({
				appointmentId: appointment._id,
				isVerified: false,
				timestamp: Date.now() + 300000,
			});

			unverified.save();
		});
		// Don't wait on success/failure, just indicate all messages have been
		// queued for delivery
		if (callback) {
			callback.call();
		}
	}
};

const Appointment = mongoose.model("appointment", AppointmentSchema);

module.exports = Appointment;
