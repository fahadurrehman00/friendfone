const mongoose = require('mongoose');
const moment = require('moment');

const UnverifiedSchema = new mongoose.Schema({
	appointmentId: {
		  type: mongoose.Schema.Types.ObjectId,
		  ref: "appointment"
	},
	isVerified: {
		  type: Boolean, default: false 	
			},
	
	timestamp: {
		  type: Date  
		  }
});



//require Notification

UnverifiedSchema.methods.requiresNotification = function() {
	console.log(Math.round(moment.duration(moment(this.timestamp)
                          .diff(moment(Date.now()))
                        ).asSeconds()));
	var time_gone = Math.round(moment.duration(moment(this.timestamp)
                          .diff(moment(Date.now()))
                        ).asSeconds());
	return ((time_gone < 5) && (time_gone > -1) && !this.isVerified);
	}



//send Notification
UnverifiedSchema.statics.sendNotifications = function(callback) {
  // now
  const searchDate = new Date();
	// console.log(searchDate);
	
  Unverified
    .find()
	.populate('appointmentId')	
    .then(function(unverifiedAppo) {
      unverifiedAppo = unverifiedAppo.filter(function(data) {
		return data.requiresNotification(searchDate);		  	
      });
      if (unverifiedAppo.length > 0) {
        sendNotifications(unverifiedAppo);
      }
    });

	
    function sendNotifications(unverifiedAppo) {
        unverifiedAppo.forEach(function(data) {
			console.log(data.appointmentId.appointmentName);
			
			// Load the AWS SDK for Node.js
				var AWS = require('aws-sdk');
				// Set region
				AWS.config.update({region: 'us-east-1'});

				// Create publish parameters
				var params = {
				  Message: `ATN:${data.appointmentId.appointmentName}, Phone: ${data.appointmentId.phoneNumber} has not been verified. ${process.env.WEB_LINK}/appointments/verify-pin/?token=${data.appointmentId.pinToken}`, /* required */
				  // PhoneNumber: process.env.COUNTRY_CODE + process.env.ADMIN_PHONE1,
				  PhoneNumber: process.env.COUNTRY_CODE + process.env.ADMIN_PHONE2,
					
				};

				// Create promise and SNS service object
				var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();

				// Handle promise's fulfilled/rejected states
				publishTextPromise.then(
				  function(data) {
					console.log("MessageID is " + data.MessageId);
				  }).catch(
					function(err) {
					console.error(err, err.stack);
				  });
			
			
			// email send 
			
			// Load the AWS SDK for Node.js
				var AWS = require('aws-sdk');
				// Set the region 
				AWS.config.update({region: 'us-east-1'});

				// Create sendEmail params 
				var params = {
				  Destination: { 
					ToAddresses: [
					  process.env.ATN_EMAIL,
					  /* more items */
					]
				  },
				  Message: { /* required */
					Body: { 
					  Text: {
					   Charset: "UTF-8",
					   Data:'Hi! Appointment Name: ' + data.appointmentId.appointmentName + '\n\n' + ' having Phone Number:' + data.appointmentId.phoneNumber + ' has not been verified. Link:\n\n' + process.env.WEB_LINK + '/appointments/' + 'verify-pin/' + '?token=' + data.appointmentId.pinToken
					  }
					 },
					 Subject: {
					  Charset: 'UTF-8',
					  Data: 'Friend Fone Unverified ATN'
					 }
					},
				  Source: process.env.ATN_EMAIL /* required */
				};

						// console.log(user.email);
				// Create the promise and SES service object
				var sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();

				// Handle promise's fulfilled/rejected states
				sendPromise.then(
				  function(data) {
					console.log(data.MessageId);
				  }).catch(
					function(err) {
					console.error(err, err.stack);
				  });
			
			
			
			// // Create options to send the message
			// const options = {
               
			// 	body: `ATN:${data.appointmentId.appointmentName},Phone: ${data.appointmentId.phoneNumber} has not been verified.${process.env.WEB_LINK}/appointments/verify-pin/?token=${data.appointmentId.pinToken}`,
			// 	from: process.env.TWILIO_PHONE_NUMBER,
			// 	to: `${process.env.COUNTRY_CODE} ${process.env.TRIAL_SMS_NUMBER}`
			// };
			// console.log(data.appointmentId.appointmentName);
			// console.log(data.appointmentId.pinToken);
			//             // Send the message!
			// client.messages
			// 	.create(options,function(err, response){
					// if (err) {
					// 	// Just log it for now
					// 	console.error(err);
					// } else {
					// 	console.log(`Message sent to ${process.env.COUNTRY_CODE} ${process.env.TRIAL_SMS_NUMBER}`);
								
					// 	//Nodemailer
					// var smtpTransport = nodemailer.createTransport({
					// service: 'Gmail', 
					// auth: {
					//   user: 'friendfonejosh@gmail.com',
					//   pass: process.env.GMAILPW
					// 	  }
					// 				});
					// var mailOptions = {
					// // to: 'zuak94@gmail.com',
					//   to: 'atn@arvogp.com',
					// from: 'friendfonejosh@gmail.com',
					// subject: 'Friend Fone Unverified ATN',
					// text: 'Hi! Appointment Name: ' + data.appointmentId.appointmentName + '\n\n' + ' having Phone Number:' + data.appointmentId.phoneNumber + ' has not been verified. Link:\n\n' + process.env.WEB_LINK + '/appointments/' + 'verify-pin/' + '?token=' + data.appointmentId.pinToken
					// 				};
					// smtpTransport.sendMail(mailOptions, function(err) {
					// console.log('mail sent');
					
					// 												});
						
				
				// 	}
				// });
		
        });
        // Don't wait on success/failure, just indicate all messages have been
        // queued for delivery
        if (callback) {
          callback.call();
        }
		
		
    }
};



const Unverified = mongoose.model('unverified', UnverifiedSchema);

module.exports = Unverified;