var express = require("express");

var router = express.Router({ mergeParams: true });

const momentTimeZone = require("moment-timezone");

const moment = require("moment");

var crypto = require("crypto");

const Appointment = require("../models/appointment");

const Unverified = require("../models/unverified");

var User = require("../models/user");

var middleware = require("../middleware");

const { isLoggedIn } = require("../middleware");

const getTimeZones = function () {
	return momentTimeZone.tz.names();
};
 

// GET: /appointments
router.get("/", function (req, res) {
	Appointment.find().then(function (appointments) {
		res.render("users/show"), { appointments: appointments };
	});
});

// GET: /appointments/create
router.post("/create", isLoggedIn, function (req, res, next) {
	User.findById(req.body.user_id, function (err, foundUser) {
		res.render("appointments/create", {
			timeZones: getTimeZones(),
			appointment: new Appointment({
				appointmentName: "",
				phoneNumber: "",
				notification: "",
				timeZone: "",
				appointmentTime: "",
				appointmentDays: "",
				author: "",
				pinToken: "",
				escalation: "",
			}),
			user: foundUser,
			timeZone: foundUser.timeZone,
		});
	});
});

// POST: /appointments
router.post("/", isLoggedIn, async (req, res, next) => {
	const appointmentName = req.body.appointmentName;
	let phoneNumber = "";
	const notification = req.body.notification;
	const appointmentTime = moment(req.body.appointmentTime, "MM-DD-YYYY hh:mma").tz(req.body.timeZone, true);

	var author = "";
	var timeZone = "";

	const user = await User.findById(req.body.user_id).exec();

	if (req.user.isAdmin || req.user._id == process.env.SUPERADMIN_ID) {
		// if logged in user is an admin or super-admin
		// add current page's user id
		timeZone = req.body.timeZone;
		author = req.body.user_id;
		phoneNumber = req.body.userPhoneNumber;
	} else {
		// add currently logged in user id
		timeZone = req.user.timeZone;
		author = req.user._id;
		phoneNumber = req.user.username;
	}

	// phoneNumber = user.isHospitality ? req.body.phoneNumber.replace( /\(\)- /g, '' ) : phoneNumber;
	phoneNumber = user.isHospitality ? req.body.phoneNumber.replace(/\D+/g, '') : phoneNumber;

	const pinToken = crypto.randomBytes(4).toString("hex");
	// const pinVerified = false;
	let data = {
		appointmentName,
		phoneNumber,
		notification,
		timeZone,
		appointmentTime,
		author,
		pinToken,
	};

	if ( user.isHospitality ) {
		const roomNumber = typeof req.body.roomNumber === "undefined" ? "" : req.body.roomNumber;
		const guestLastname = typeof req.body.guestLastname === "undefined" ? "" : req.body.guestLastname;
		const followupTime1 = typeof req.body.followupTime1 === "undefined" ? "" : req.body.followupTime1;
		const followupTime2 = typeof req.body.followupTime2 === "undefined" ? "" : req.body.followupTime2;

		data = { ...data, roomNumber, guestLastname, followupTime1, followupTime2 };
	} else {
		const repeatAtn = typeof req.body.repeatAtn !== "undefined";
		const repeatType = typeof req.body.repeatType === "undefined" ? 1 : 2;
		const appointmentDays = repeatType == 1 ? req.body.appointmentDays : [ req.body.repeatDay ];
		const escalation = req.body.escalation;

		data = { ...data, repeatAtn, repeatType, appointmentDays, escalation };
	}

	const appointment = new Appointment( data );

	appointment.save().then(function () {
		if (req.user.isAdmin || req.user._id == process.env.SUPERADMIN_ID) {
			res.redirect("/users/" + req.body.user_id);
		} else {
			res.redirect("/users/" + req.user._id);
		}
	});
});

router.get("/:id/edit", middleware.checkProfileOwnership, function (req, res) {
	Appointment.findById(req.params.id, function (err, appointment) {
		if (err) {
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if ( typeof appointment.repeatAtn === "undefined" || typeof appointment.repeatType === "undefined" ) {
				const hasDays = appointment.appointmentDays.length > 0;
				appointment.repeatAtn = hasDays;
				appointment.repeatType = 1;
			}

			res.render("appointments/edit", { timeZones: getTimeZones(), appointment });
		}
	});
});

// PUT: /appointments/:id
router.put("/:id", middleware.checkProfileOwnership, function (req, res) {
	//find and update the correct appointment

	Appointment.findById(req.params.id, function (err, appointment) {
		if (err) {
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			const repeatAtn = typeof req.body.repeatAtn !== "undefined";
			const repeatType = typeof req.body.repeatType === "undefined" ? 1 : 2;
			const appointmentDays = repeatType == 1 ? req.body.appointmentDays : [ req.body.repeatDay ];

			appointment.appointmentName = req.body.appointmentName;
			appointment.repeatAtn = repeatAtn;
			appointment.repeatType = repeatType;

			appointment.appointmentDays = appointmentDays;

			appointment.appointmentTime = moment(req.body.appointmentTime, "MM-DD-YYYY hh:mma").tz(
				req.body.timeZone,
				true
			);
			appointment.timeZone = req.body.timeZone;
			appointment.phoneNumber = req.body.phoneNumber;
			appointment.notification = req.body.notification;
			appointment.escalation = req.body.escalation;
			const user_id = req.body.user_id;
			var author = "";
			if (req.user.isAdmin) {
				// add author to appointments
				author = user_id;
			} else {
				author = req.user._id;
			}
			appointment.save();
			// console.log("1");
			// 			req.flash("success", "Successfully Updated");
			// console.log("2");

			// if (req.user.isAdmin) { res.redirect('/users/' + user_id);console.log("3"); }

			// else { res.redirect('/users/' + req.user._id); }

			req.flash("success", "Successfully Updated");

			//redirect to user's show page
			if (req.user.isAdmin || req.user._id == process.env.SUPERADMIN_ID) {
				res.redirect("/users/" + req.body.user_id);
			} else {
				res.redirect("/users/" + req.user._id);
			}
		}
	});
});

router.delete("/:id", middleware.checkProfileOwnership, async function (req, res) {
	Appointment.findById(req.params.id, async function (err, appointment) {
		if (err) {
			req.flash("error", err.message);
			console.log("err");
			return res.redirect("back");
		}
		try {
			appointment.remove();
			req.flash("success", "Appointment Deleted Successfully");
			if (req.user.isAdmin || req.user._id == process.env.SUPERADMIN_ID) {
				res.redirect("/users/" + req.body.user_id);
			} else {
				res.redirect("/users/" + req.user._id);
			}
		} catch {
			req.flash("error", err.message);
			console.log("err");
			return res.redirect("back");
		}
	});
});

//pin verification routes

router.get("/verify-pin", function (req, res) {
	Appointment.findOne({ pinToken: req.query.token }, function (err, appointment) {
		if (!appointment) {
			req.flash("error", "Verify Pin token is invalid or Please login.");
			return res.redirect("/login");
		}
		res.render("appointments/verify-pin", { pinToken: req.query.token });
	});
});

router.post("/verify-pin", async function (req, res, next) {

	Appointment.find({ pinToken: req.query.token })
		.populate("author")
		.exec((err, appointment) => {
			if (err) {
				req.flash("error", "Error reading ATNs");
				return res.redirect("back");
			} else if (appointment[0].author.pin == req.body.enteredPin) {
				Unverified.findOne({ appointmentId: appointment[0]._id }, async (err, data) => {
					try {
						data.isVerified = true;
						data.save((e, d) => {
							if (e) {
								req.flash("error", "Error saving unverified");
								console.log("failed to save atn");
								return res.redirect("back");
							}
							req.flash("success", "Pin successfully Verified.");

							// data.remove();

							return res.redirect("/verify-pin");
						});
					} catch {
						req.flash("error", "Pin is already verified!");
						res.redirect("back");
					}
				});
			} else {
				req.flash("error", "Invalid PIN. Try again!");
				return res.redirect("back");
			}
		});
});

module.exports = router;
