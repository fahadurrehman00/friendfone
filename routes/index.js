var express = require('express');

var AWS = require('aws-sdk');

var router = express.Router({ mergeParams: true });

var User = require('../models/user');

var Unverified = require('../models/unverified');

var middleware = require('../middleware');

var passport = require('passport');

const momentTimeZone = require('moment-timezone');

const Appointment = require('../models/appointment');

const Note = require('../models/note');

var async = require('async');

var crypto = require('crypto');


var multer = require('multer');

const uuid = require('uuid'); 

const fs = require('fs');

const { isNotVerified, isAdmin } = require('../middleware');

const { isLoggedOut } = require('../middleware');

const { isSuperAdmin } = require('../middleware');


const { validateForm } = require('../lib');

// Set the region
AWS.config.update({ region: 'us-east-1' });

const getTimeZones = function () {
    return momentTimeZone.tz.names();
};

// image upload
var storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, uuid().slice(0,6) + file.originalname);
    },
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|heic|heif|svg)$/i)) {
        return cb(
            new Error('Only image files are allowed in jpg, jpeg, png, gif, heic, svg and heif format.'),
            false
        );
    }
    cb(null, true);
};

var upload = multer({ 
    storage:storage, 
    fileFilter: imageFilter, 
});


//billing
const loginId = process.env.LOGIN_ID;
const transactionKey = process.env.TRANSACTION_KEY;
const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
const SDKConstants = require('authorizenet').Constants;

// //****************************
// // Pages for All Users
// //****************************

router.get('/', function (req, res) {
    res.render("home/index");
});

router.get('/support', function (req, res) {
    res.render('support/index');
});

function mailResponder(reqBody) {
    var {name,phone,email,text,emailForLearnMore,phoneForLearnMore,page_name} = reqBody; 
    
    var body =
        'Hi, Admin!\nThis is the information received from ' + name  +
        ` \nSent From: ${page_name} \nName: ${name}\nPhone: ${phone}\nEmail: ${email} \nText: ${text}`;

    var mailSubject = 'Support Info';

    if(emailForLearnMore || phoneForLearnMore ) {
        phone = phoneForLearnMore;
        email = emailForLearnMore;
        var  website = reqBody.website || "didn't mention anything";
        var organization = reqBody.organization || "didn't mention anything";

        body =
        `Hi, Admin!\nThis is the information received from ${name}. The user want to learn more about friendfone below you will get the user details.` +
        `\nSent From : ${page_name} \nName: ${name} \nPhone: ${phone} \nEmail: ${email} \nOrganization: ${organization} \nWebsite: ${website}`;
       
        mailSubject = (page_name.indexOf('Partnership Section') !== -1 ) ? 'Asking for details about FriendFone Partnership' : 'Asking for more information about FriendFone';
    }
    return { body, mailSubject, email };
}

router.post('/support', function (req, res) {
    var {body,mailSubject,email} = mailResponder(req.body);
    // Create sendEmail params
    var params = {
        Destination: {
            ToAddresses: [
                'FFSupport@ArvoGP.com',
            ],
        },
        Message: {
            Body: {
                Text: {
                    Charset: 'UTF-8',
                    Data: body,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: mailSubject,
            },
        },
        Source: process.env.FRIENDFONE_EMAIL,
        ReplyToAddresses: [
            email,
        ]
    };

    // Create the promise and SES service object
    var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise
        .then(function (data) {
            req.flash('success', 'An e-mail has been sent to Support Department.');
            res.redirect(`emailsucceed`);
        })
        .catch(function (err) {
            res.redirect('emailfailed')
        });
});

router.get('/pricing', function (req, res) {
    res.render('pricing/index');
});

router.post('/pricing', function (req, res) {
    var name = req.body.name,
        phone = req.body.phone,
        email = req.body.email,
        city = req.body.city,
        state = req.body.state;

    var body =
        'Hi, Admin!\nThis is the information received from the pricing page' +
        `\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nCity: ${city}\nState: ${state}`;

    // Create sendEmail params
    var params = {
        Destination: {
            ToAddresses: [
                process.env.SUPPORT_EMAIL_ID,
                /* more items */
            ],
        },
        Message: {
            /* required */
            Body: {
                Text: {
                    Charset: 'UTF-8',
                    Data: body,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Info from the pricing page',
            },
        },
        Source: process.env.SUPPORT_EMAIL_ID /* required */,
    };

    // console.log(Email);
    // Create the promise and SES service object
    var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise
        .then(function (data) {
            console.log(data.MessageId);
            req.flash('success', 'An e-mail has been sent to Pricing Department.');
            res.redirect('pricing');
        })
        .catch(function (err) {
            console.error(err, err.stack);
        });
});

router.get('/compliance-legal-and-policies', function (req, res) {
    res.render('compliance-legal-and-policies');
});

// //****************************
// // AUTH ROUTES BELOW
// //****************************

router.get('/register', isLoggedOut, function (req, res) {
    res.render('register', { timeZones: getTimeZones() });
});

// //handle signup logic
router.post('/register', upload.single('image'), async (req, res) => {
    
    // Validation
    const validationErrors = validateForm(req.body);

    if (validationErrors.length > 0) {
        
        req.flash('error', validationErrors[0].msg );
        return res.redirect('back');
    }
   
    let imageUrl =  '';
    let imageId = '' ;
    if (req.file) {
        try {
            const s3 = new AWS.S3({});
            const uploadParams = {
                Bucket:process.env.MEDIA_BUCKET,
                Key: process.env.USER_FOLDER + req.file.filename,
                Body: fs.createReadStream(req.file.path)
            }
            var result = await s3.upload(uploadParams).promise();
            imageId = result.Key;
            imageUrl = result.Location;
        } catch (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
    }

    //add new user
    var newUser = new User({
        username: req.body.phoneNumber.replace(/\D/g,''),
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        emailToken: crypto.randomBytes(64).toString('hex'),
        isVerified: false,
        image: imageUrl,
        imageId: imageId,
        pin: req.body.pin.replace(/\D/g,''),
        timeZone: req.body.timeZone,
        streetAddress: req.body.streetAddress,
        secondAddress: req.body.secondAddress,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        purpose: req.body.purpose,
        promoCode: req.body.promoCode,
        friendPhone: req.body.friendPhone,
        schoolPhone: req.body.schoolPhone,
        //EC1
        ec1firstName: req.body.ec1firstName,
        ec1lastName: req.body.ec1lastName,
        ec1email: req.body.ec1email,
        ec1phoneNumber: req.body.ec1phoneNumber,
        ec1Relation: req.body.ec1Relation,
        ec1streetAdress: req.body.ec1streetAdress,
        ec1secondary: req.body.ec1secondary,
        ec1city: req.body.ec1city,
        ec1state: req.body.ec1state,
        ec1zipCode: req.body.ec1zipCode,
        //EC2
        ec2firstName: req.body.ec2firstName,
        ec2lastName: req.body.ec2lastName,
        ec2email: req.body.ec2email,
        ec2phoneNumber: req.body.ec2phoneNumber,
        ec2Relation: req.body.ec2Relation,
        ec2streetAdress: req.body.ec2streetAdress,
        ec2secondary: req.body.ec2secondary,
        ec2city: req.body.ec2city,
        ec2state: req.body.ec2state,
        ec2zipCode: req.body.ec2zipCode,
    });

    //Billing code

    var {
        cc,
        cvv,
        expire,
        amount,
        billfirstName,
        billlastName,
        billstreetAddress,
        billsecondary,
        billcity,
        billstate,
        billzipCode,
    } = req.body;

    let taxAmount = (parseFloat(amount) * 0.0625).toFixed(2);

    amount = (parseFloat(amount) + parseFloat(taxAmount)).toString();

    // const { cc, cvv, expire, amount, billfirstName, billlastName, billstreetAddress, billsecondary, billcity, billstate, billzipCode } = req.body;

    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    const creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(cc);
    creditCard.setExpirationDate(expire);
    creditCard.setCardCode(cvv);

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    // const tax = new ApiContracts.ExtendedAmountType();
    // tax.setAmount(taxAmount);

    const billTo = new ApiContracts.CustomerAddressType();
    billTo.setFirstName(billfirstName);
    billTo.setLastName(billlastName);
    billTo.setAddress(billstreetAddress);
    billTo.setCity(billcity);
    billTo.setState(billstate);
    billTo.setZip(billzipCode);

    const transactionSetting1 = new ApiContracts.SettingType();
    transactionSetting1.setSettingName('duplicateWindow');
    transactionSetting1.setSettingValue('120');

    const transactionSetting2 = new ApiContracts.SettingType();
    transactionSetting2.setSettingName('emailCustomer');
    transactionSetting2.setSettingValue('true');

    const transactionSetting3 = new ApiContracts.SettingType();
    transactionSetting3.setSettingName('recurringBilling');
    transactionSetting3.setSettingValue('true');

    const transactionSettingList = [];
    transactionSettingList.push(transactionSetting1);
    transactionSettingList.push(transactionSetting2);
    transactionSettingList.push(transactionSetting3);

    const transactionSettings = new ApiContracts.ArrayOfSetting();
    transactionSettings.setSetting(transactionSettingList);

    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
        ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);
    // transactionRequestType.setTax(tax);
    transactionRequestType.setBillTo(billTo);
    transactionRequestType.setTransactionSettings(transactionSettings);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);
    

    //pretty print request
    // console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

    // For PRODUCTION use
    ctrl.setEnvironment(SDKConstants.endpoint.production);

    User.register(newUser, req.body.password, async function (err, user) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('home');
        } else {
            //======= Send Email to User ======//
            
            const userEmailBody = `
                <h1 style="color:green;"> Hey ${user.firstName} </h1>
                <p style="font-size:20px;"> Thanks for getting signed up with Friend Fone an Arvo Growth Partners software! I just wanted to reach out and let you know that we’re glad you signed up
                and if you have any questions we’re here to help!
                </p>
                <strong style="margin-bottom:7px;font-size: 15px;">In case you need them, here is a link to log in and a video to show you how to use the software!</strong>
                <br>
                <br>
                <a style="margin-bottom:7px;font-size: 15px;" href="https://friendfone.com/login">Log into FriendFone</a>
                <br>
                <a style="margin-bottom:7px;font-size:15px;" href="https://www.youtube.com/watch?v=UqGQUYkW0bw">
                    Watch this video to learn how to use FriendFone!
                </a>
                <br>
                <h3>Cheers, <br> <span style="color:green;">Peyton</span> </h3>    
                `;

            // Create the promise and SES service object
            var sendUserEmailPromise = new AWS.SES({ apiVersion: '2010-12-01' })
                .sendEmail({
                    Destination: { ToAddresses: [ user.email ] },
                    Message: {
                        Body: {
                            Html: {
                                Charset:'UTF-8',
                                Data:userEmailBody,
                            },
                        },
                        Subject: {
                            Charset: 'UTF-8',
                            Data: 'Friend Fone Account Created',
                        },
                    },
                    Source: 'friendfone@arvogp.com' /* required */,
                }).promise();

            // Handle promise's fulfilled/rejected states
            sendUserEmailPromise
                .then( data => console.log(data.MessageId) )
                .catch( err => console.error(err, err.stack) );

            

            //======= Send Email to Admin ======//
            const adminEmailBody = `Hey team,\n\nWe just had a new user sign up! Their phone number is ${user.username}.\nIf you could check them out and make sure that there is not an issue with the billing, they should be good to go! You’ll also need to get them added to the user spreadsheet.\n\nCheers,\nPeyton`;

            // Create the promise and SES service object
            var sendAdminEmailPromise = new AWS.SES({ apiVersion: '2010-12-01' })
                .sendEmail({
                    Destination: { ToAddresses: [ 'signup@arvogp.com' ] },
                    Message: {
                        Body: {
                            Text: {
                                Charset: 'UTF-8',
                                Data: adminEmailBody,
                            },
                        },
                        Subject: {
                            Charset: 'UTF-8',
                            Data: 'FF New User Registration',
                        },
                    },
                    Source: 'friendfone@arvogp.com' /* required */,
                }).promise();

            // Handle promise's fulfilled/rejected states
            sendAdminEmailPromise
                .then( data => console.log(data.MessageId) )
                .catch( err => console.error(err, err.stack) );

            

            ctrl.execute(() => {
                const apiResponse = ctrl.getResponse();
                const response = new ApiContracts.CreateTransactionResponse(apiResponse);

                //pretty print response
                console.log(JSON.stringify(response, null, 2));

                if (response !== null) {
                    if (
                        response.getMessages().getResultCode() ===
                        ApiContracts.MessageTypeEnum.OK
                    ) {
                        if (response.getTransactionResponse().getMessages() !== null) {
                            // console.log(
                            //     'Successfully created transaction with Transaction ID: ' +
                            //         response.getTransactionResponse().getTransId()
                            // );
                            // console.log(
                            //     'Response Code: ' +
                            //         response.getTransactionResponse().getResponseCode()
                            // );
                            // console.log(
                            //     'Message Code: ' +
                            //         response
                            //             .getTransactionResponse()
                            //             .getMessages()
                            //             .getMessage()[0]
                            //             .getCode()
                            // );
                            // console.log(
                            //     'Description: ' +
                            //         response
                            //             .getTransactionResponse()
                            //             .getMessages()
                            //             .getMessage()[0]
                            //             .getDescription()
                            // );
                            
                            createSubscription(req.body, function(){
                                // console.log('createSubscription call complete.');
                                
                                req.flash('success', 'Welcome to Friend Fone ' + user.firstName);
                                req.logIn(user, async (err) => {
                                    if (err) return next(err);
                                    req.flash(
                                        'success',
                                        'Welcome to YelpCamp ' +
                                            user.firstName +
                                            ' please login to continue'
                                    );
                                    const redirectUrl = req.session.redirectTo || '/login';
                                    delete req.session.redirectTo;
                                    res.redirect(redirectUrl);
                                });
                            });
                        } else {
                            // console.log('Failed Transaction.');
                            if (response.getTransactionResponse().getErrors() !== null) {
                                // console.log(
                                //     'Error Code: ' +
                                //         response
                                //             .getTransactionResponse()
                                //             .getErrors()
                                //             .getError()[0]
                                //             .getErrorCode()
                                // );
                                // console.log(
                                //     'Error message: ' +
                                //         response
                                //             .getTransactionResponse()
                                //             .getErrors()
                                //             .getError()[0]
                                //             .getErrorText()
                                // );
                            }
                        }
                    } else {
                        // console.log('Failed Transaction. ');
                        if (
                            response.getTransactionResponse() !== null &&
                            response.getTransactionResponse().getErrors() !== null
                        ) {
                            // console.log(
                            //     'Error Code: ' +
                            //         response
                            //             .getTransactionResponse()
                            //             .getErrors()
                            //             .getError()[0]
                            //             .getErrorCode()
                            // );
                            // console.log(
                            //     'Error message: ' +
                            //         response
                            //             .getTransactionResponse()
                            //             .getErrors()
                            //             .getError()[0]
                            //             .getErrorText()
                            // );
                        } else {
                            // console.log(
                            //     'Error Code: ' +
                            //         response.getMessages().getMessage()[0].getCode()
                            // );
                            // console.log(
                            //     'Error message: ' +
                            //         response.getMessages().getMessage()[0].getText()
                            // );
                        }
                    }
                } else {
                    // console.log('Null Response.');
                }
            });
                // res.redirect('/login');
        }
    });
});

//verifycard
router.post('/verifycard', function (req, res) {
    const validationErrors = validateForm(req.body);

    if (validationErrors.length > 0) {
        let errors = '';
        validationErrors.forEach((element) => {
            errors += element.msg + '\n';
        });
        return res.json({
            response: 'failed',
            errors: errors,
        });
    } else {
        return res.json({
            response: 'success',
        });
    }
});

//show login form
router.get('/login', isLoggedOut, function (req, res) {
    res.render('login');
});

//handling login logic
router.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user) {
        if (err) {
            req.flash('error', 'Something went wrong. Kindly contact us.');
            return res.redirect('/login');
        }
        if (!user) {
            req.flash('error', 'Authentication failed.');
            return res.redirect('/login');
        }

        // If user is banned.
        if (user.banned) {
            req.flash('error', `Account Locked: ${user.banReason}`);
            return res.redirect('/login');
        }

        req.logIn(user, function (err) {
            if (err) {
                req.flash('error', 'Something went wrong. Please contact us for assistance');
                return res.redirect('/login');
            }
            if (user.isAdmin == true) {
                req.flash('success', 'Welcome to Friend Fone!');
                return res.redirect('/admin');
            }
            req.flash('success', 'Welcome to Friend Fone!');
            return res.redirect('/users/' + req.user._id);
        });
    })(req, res, next);
});

//logout route
router.get('/logout', function (req, res) {
    req.logout();
    req.flash('success', 'See you later!');
    res.redirect('/login');
});

//FORGOT PASSWORD
router.get('/forgot', isLoggedOut, function (req, res) {
    res.render('forgot');
});

router.post('/forgot', function (req, res, next) {
    async.waterfall(
        [
            function (done) {
                crypto.randomBytes(20, function (err, buf) {
                    var token = buf.toString('hex');
                    done(err, token);
                });
            },
            function (token, done) {
                User.findOne({ email: new RegExp('^' + req.body.email.trim() + '$', 'i') }, function (err, user) {
                    if (!user) {
                        req.flash('error', 'No account with that email address exists.');
                        return res.redirect('/forgot');
                    }

                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                    user.save(function (err) {
                        done(err, token, user);
                    });
                });
            },
            function (token, user, done) {
                const emailBody = `Hey ${user.firstName},\n\nIt looks like someone requested a password reset for your Friend Fone account.\nIf this was you, please click the link below within one hour in order to reset your password.\n\nhttps://${req.headers.host}/reset/${token}\n\nIf you did not request a password reset, please disregard this email, your password will not be changed.\n\nCheers,\nPeyton`;

                // Create sendEmail params
                var params = {
                    Destination: {
                        ToAddresses: [
                            user.email,
                            /* more items */
                        ],
                    },
                    Message: {
                        /* required */
                        Body: {
                            Text: {
                                Charset: 'UTF-8',
                                Data: emailBody,
                            },
                        },
                        Subject: {
                            Charset: 'UTF-8',
                            Data: 'Friend Fone Password Reset',
                        },
                    },
                    Source: 'friendfone@arvogp.com' /* required */,
                };

                console.log(user.email);
                // Create the promise and SES service object
                var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' })
                    .sendEmail(params)
                    .promise();

                // Handle promise's fulfilled/rejected states
                sendPromise
                    .then(function (data) {
                        console.log(data.MessageId);
                        req.flash(
                            'success',
                            'An e-mail has been sent to ' +
                                user.email +
                                ' with further instructions.'
                        );
                        res.redirect('/forgot');
                    })
                    .catch(function (err) {
                        console.error(err, err.stack);
                    });
            },
        ],
        function (err) {
            if (err) return next(err);
            res.redirect('/forgot');
        }
    );
});

router.get('/reset/:token', function (req, res) {
    User.findOne(
        { resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } },
        function (err, user) {
            if (!user) {
                req.flash('error', 'Password reset token is invalid or has expired.');
                return res.redirect('/forgot');
            }
            res.render('reset', { token: req.params.token });
        }
    );
});

router.post('/reset/:token', function (req, res) {
    async.waterfall(
        [
            function (done) {
                User.findOne(
                    {
                        resetPasswordToken: req.params.token,
                        resetPasswordExpires: { $gt: Date.now() },
                    },
                    function (err, user) {
                        if (!user) {
                            req.flash('error', 'Password reset token is invalid or has expired.');
                            return res.redirect('back');
                        }
                        if (req.body.password === req.body.confirm) {
                            user.setPassword(req.body.password, function (err) {
                                user.resetPasswordToken = undefined;
                                user.resetPasswordExpires = undefined;

                                user.save(function (err) {
                                    req.logIn(user, function (err) {
                                        done(err, user);
                                    });
                                });
                            });
                        } else {
                            req.flash('error', 'Passwords do not match.');
                            return res.redirect('back');
                        }
                    }
                );
            },

            function (user, done) {

                const emailBody = `Hey There,\n\nWe wanted to let you know that your password was recently changed.\nIf this was you, no actions will be required. You can now use your new password to log into your account.\nIf this was not you please contact us at Friendfone.com/support.\n\nCheers,\nPeyton`;

                // Create sendEmail params
                var params = {
                    Destination: {
                        ToAddresses: [
                            user.email,
                            /* more items */
                        ],
                    },
                    Message: {
                        /* required */
                        Body: {
                            Text: {
                                Charset: 'UTF-8',
                                Data: emailBody,
                            },
                        },
                        Subject: {
                            Charset: 'UTF-8',
                            Data: 'Your FriendFone Password Has Been Changed',
                        },
                    },
                    Source: 'friendfone@arvogp.com' /* required */,
                };

                console.log(user.email);
                // Create the promise and SES service object
                var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' })
                    .sendEmail(params)
                    .promise();

                // Handle promise's fulfilled/rejected states
                sendPromise
                    .then(function (data) {
                        console.log(data.MessageId);
                        req.flash('success', 'Success! Your password has been changed.');
                        res.redirect('/users/' + req.user._id);
                    })
                    .catch(function (err) {
                        console.error(err, err.stack);
                    });
            },
        ],
        function (err) {
            res.redirect('/login');
        }
    );
});

// isLoggedIn,

// USER PROFILES
router.get('/users/:id', middleware.isLoggedIn, middleware.checkProfileOwnership, function (
    req,
    res
) {
    User.findById(req.params.id, function (err, foundUser) {
        if (err) {
            req.flash('error', 'Something went wrong');
            res.redirect('/');
        } else {
            Note.find()
                .where('author')
                .equals(foundUser._id)
                .exec(function (err, notes) {
                    if (err) {
                        req.flash('error', 'Something went wrong');
                        res.redirect('/');
                    } else {
                        Appointment.find()
                            .where('author')
                            .equals(foundUser._id)
                            .exec(function (err, appointments) {
                                if (err) {
                                    req.flash('error', 'Something went wrong');
                                    res.redirect('/');
                                } else {
                                    Unverified.find({ appointmentId: { $in: appointments } })
                                        .populate('appointmentId')
                                        .then(function (unverified) {
                                            if (!unverified) {
                                                req.flash('error', 'Something went wrong');
                                                res.redirect('/');
                                            } else {

                                                appointments.map( (appointment, i) => {
                                                    if ( foundUser.isHospitality && ( typeof appointment.repeatAtn == "undefined" || typeof appointment.repeatType == "undefined" ) ) {
                                                        const hasDays = appointment.appointmentDays.length > 0;
                                                        appointment.repeatAtn = hasDays;
                                                        appointment.repeatType = 1;
                                                    }

                                                    return appointment;
                                                } );

                                                res.render('users/show', {
                                                    user: foundUser,
                                                    appointments,
                                                    notes,
                                                    unverified: unverified,
                                                });
                                            }
                                        });
                                }
                            });
                    }
                });
        }
    });
});

//Edit User Route
router.get('/users/:id/edit', middleware.isLoggedIn, middleware.checkProfileOwnership, function (
    req,
    res
) {
    User.findById(req.params.id, function (err, foundUser) {
        if (err) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            if ( foundUser.isHospitality ) {
                req.flash('error', "Cannot edit this account.");
                res.redirect('back');

                return;
            }

            res.render('users/edit', { user: foundUser, timeZones: getTimeZones() });
        }
    });
});

router.put('/users/:id', upload.single('image'), middleware.checkProfileOwnership, function (
    req,
    res
) {
    //find and update the correct user
    User.findById(req.params.id, async function (err, user) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        } else {
            if (req.file) {
                try {
                    const s3 = new AWS.S3({});
                    const uploadParams = {
                        Bucket:process.env.MEDIA_BUCKET,
                        Key:process.env.USER_FOLDER + req.file.filename,
                        Body:fs.createReadStream(req.file.path)
                    }
                    var result = await s3.upload(uploadParams).promise();
                    user.imageId = result.Key;
                    user.image = result.Location;
                } catch (err) {
                    req.flash('error', err.message);
                    return res.redirect('back');
                }
            }
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.username = req.body.phoneNumber.replace(/\D/g,'');
            user.pin = req.body.pin.replace(/\D/g,'');
            user.timeZone = req.body.timeZone;
            user.streetAddress = req.body.streetAddress;
            user.secondAddress = req.body.secondAddress;
            user.city = req.body.city;
            user.state = req.body.state;
            user.zipCode = req.body.zipCode;
            user.memo = req.body.memo;
            user.firstContact = req.body.firstContact;
            user.secondContact = req.body.secondContact;
            user.friendPhone = req.body.friendPhone;
            user.schoolPhone = req.body.schoolPhone;

            //EC1
            user.ec1firstName = req.body.ec1firstName;
            user.ec1lastName = req.body.ec1lastName;
            user.ec1email = req.body.ec1email;
            user.ec1phoneNumber = req.body.ec1phoneNumber;
            user.ec1Relation = req.body.ec1Relation;
            user.ec1streetAdress = req.body.ec1streetAdress;
            user.ec1secondary = req.body.ec1secondary;
            user.ec1city = req.body.ec1city;
            user.ec1state = req.body.ec1state;
            user.ec1zipCode = req.body.ec1zipCode;
            //EC2
            user.ec2firstName = req.body.ec2firstName;
            user.ec2lastName = req.body.ec2lastName;
            user.ec2email = req.body.ec2email;
            user.ec2phoneNumber = req.body.ec2phoneNumber;
            user.ec2Relation = req.body.ec2Relation;
            user.ec2streetAdress = req.body.ec2streetAdress;
            user.ec2secondary = req.body.ec2secondary;
            user.ec2city = req.body.ec2city;
            user.ec2state = req.body.ec2state;
            user.ec2zipCode = req.body.ec2zipCode;

            user.save()
                .then((u) => {
                    req.flash('success', 'Profile Successfully Updated');
                    //redirect somewhere(show page)
                    return res.redirect('/users/' + req.params.id);
                })
                .catch((err) => {
                    console.log(err);
                    console.log(user.username);
                    req.flash('error', 'Something Went Wrong');
                    return res.redirect('/users/' + req.params.id);
                });
        }
    });
});

// POST: /users/:id/ban
router.post('/users/:id/ban-unban', isAdmin, async (req, res, next) => {
    const userId = req.params.id;
    const ban = req.body.ban;
    const banReason = ban ? req.body.reason : "";
    let banned = ! ban;

    try {
        const user = await User.findByIdAndUpdate(userId, { banned: ban, banReason }, { new: true });
        banned = user.banned;

        console.log(user);
    } catch (error) {
        console.log(error);
    }


    // const user = await User.findById(userId);

    // user.banned = true;
    // user.banReason = banReason;

    // const save = await user.save();

    // if ( typeof user._id != 'undefined' )
  
    return res.json({ banned });
});

//ROUTES FOR CREATING AN ADMIN FROM ADMIN PROFILE

//get route for creating admin
router.get('/createAdmin', isSuperAdmin, function (req, res) {
    res.render('admin/create');
});

//post route for creating admin
router.post('/createAdmin', isSuperAdmin, upload.single('image'), async function (req, res) {
    const s3 = new AWS.S3({});
    const uploadParams = {
        Bucket:process.env.MEDIA_BUCKET,
        Key:process.env.USER_FOLDER + req.file.filename,
        Body:fs.createReadStream(req.file.path)
    };
    s3.upload(uploadParams, function (err, result) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        //add new user
        var newUser = new User({
            username: req.body.username.replace(/\D/g,''),
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            image: result.Location,
            imageId: result.Key,
        });

        if (req.body.adminCode === process.env.ADMIN_CODE) {
            newUser.isAdmin = true;
        }

        User.register(newUser, req.body.password, async function (err, user) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('/createAdmin');
            }
            req.flash('success', 'Admin account created successfully!');
            res.redirect('/createAdmin');
        });
    });
});

// ROUTES FOR CREATING AN HOSPITALITY FROM ADMIN PROFILE

// Get route for creating hospitality
router.get('/hospitality-account', isSuperAdmin, function (_, res) {
    res.render('hospitality-account');
});

// Post route for creating hospitality
router.post('/hospitality-account', isSuperAdmin, upload.single('image'), async function (req, res) {
    const s3 = new AWS.S3({});
    const uploadParams = {
        Bucket:process.env.MEDIA_BUCKET,
        Key:process.env.USER_FOLDER + req.file.filename,
        Body:fs.createReadStream(req.file.path)
    };
    s3.upload(uploadParams, function (err, result) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }

        //add new user
        var newUser = new User({
            username: req.body.username.replace(/\D/g,''), // Company Phone
            firstName: req.body.companyName,
            streetAddress: req.body.companyAddress,
            directLine: req.body.directLine,
            isHospitality: true,
            email: req.body.email,
            image: result.Location, // Logo
            imageId: result.Key,
            pointOfContact: req.body.pointOfContact,
            timeZone: "US/Central",
        });

        User.register(newUser, req.body.password, async function (err, user) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('/hospitality-account');
            }
            req.flash('success', 'Hospitality account created successfully!');
            res.redirect('/admin');
        });
    });
});


// create ARB function
function createSubscription(data, callback) {
	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(loginId);
	merchantAuthenticationType.setTransactionKey(transactionKey);

	var interval = new ApiContracts.PaymentScheduleType.Interval();
	interval.setLength(1);
	interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

	var paymentScheduleType = new ApiContracts.PaymentScheduleType();
	paymentScheduleType.setInterval(interval);
	paymentScheduleType.setStartDate((new Date()).toISOString().substring(0, 10));
	paymentScheduleType.setTotalOccurrences(999);
	paymentScheduleType.setTrialOccurrences(0);

	var creditCard = new ApiContracts.CreditCardType();
	creditCard.setExpirationDate(data.expire);
	creditCard.setCardNumber(data.cc);
	creditCard.setCardCode(data.cvv);

	var payment = new ApiContracts.PaymentType();
	payment.setCreditCard(creditCard);

	// var orderType = new ApiContracts.OrderType();
	// orderType.setInvoiceNumber(utils.getRandomString('Inv:'));
	// orderType.setDescription(utils.getRandomString('Description'));

	var customer = new ApiContracts.CustomerType();
	customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
	customer.setId(Date.now().toString());
	customer.setEmail(data.email);
	customer.setPhoneNumber(data.phoneNumber);
	// customer.setFaxNumber('N/A');
	// customer.setTaxId('N/A');

	var nameAndAddressType = new ApiContracts.NameAndAddressType();
	nameAndAddressType.setFirstName(data.firstName);
	nameAndAddressType.setLastName(data.lastName);
	nameAndAddressType.setCompany('');
	nameAndAddressType.setAddress(data.billstreetAddress);
	nameAndAddressType.setCity(data.billcity);
	nameAndAddressType.setState(data.billstate);
	nameAndAddressType.setZip(data.billzipCode);
	nameAndAddressType.setCountry('USA');
	
	var arbSubscription = new ApiContracts.ARBSubscriptionType();
	arbSubscription.setName(`${data.firstName} ${data.lastName} - monthly subscription`);
	arbSubscription.setPaymentSchedule(paymentScheduleType);
	arbSubscription.setAmount((parseFloat(data.amount) + parseFloat((parseFloat(data.amount) * 0.0625).toFixed(2))).toString());
	arbSubscription.setTrialAmount((parseFloat(data.amount) + parseFloat((parseFloat(data.amount) * 0.0625).toFixed(2))).toString());
	arbSubscription.setPayment(payment);
	// arbSubscription.setOrder(orderType);
	arbSubscription.setCustomer(customer);
	arbSubscription.setBillTo(nameAndAddressType);
	arbSubscription.setShipTo(nameAndAddressType);

	var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setSubscription(arbSubscription);

	// console.log(JSON.stringify(createRequest.getJSON(), null, 2));
		
	var ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());
	
	// For PRODUCTION use
	ctrl.setEnvironment(SDKConstants.endpoint.production);

	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

		// console.log(JSON.stringify(response, null, 2));

		if(response != null){
			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
				console.log('Subscription Id : ' + response.getSubscriptionId());
				console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
				console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
			}
			else{
				console.log('Result Code: ' + response.getMessages().getResultCode());
				console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
				console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
			}
		}
		else{
			// console.log('Null Response.');
		}
		
		callback(response);
	});
}

router.get('/emailsucceed', (req,res) => {
    res.render('emailResponse/success');
})

router.get('/emailfailed', (req,res) => {
    res.render('emailResponse/fail');
})

// aws s3 bucket it public . if you want to block public access then use this route to fetch image from aws s3 bucket 
// for example a img tag <img src="/img/About_Us_Photo_zqekif.png">
// this will be the same as <img src="https://mediaanduserfiles.s3.amazonaws.com/About_Us_Photo_zqekif.png" />
// however putting wrong params will generate error and terminate server so be careful;

router.get('/image/:key', (req,res) => {
    console.log(req.params);
    const downloadParams = {
        Bucket:process.env.MEDIA_BUCKET,
        Key:req.params.key,
    }
    try {
        const s3 = new AWS.S3({});
        const result =  s3.getObject(downloadParams);
        result.createReadStream().pipe(res);
    } catch (e) {
        res.status(403).send('there is no such file type');
    }
     
})


router.get('/49282917', (req,res) => {
    res.render('test/imagetest.ejs');
})

router.post('/image-test' , upload.single('image'), async (req,res) => {
    try {
        const s3 = new AWS.S3({});
        const uploadParams = {
            Bucket: process.env.MEDIA_BUCKET,
            Key:'test/' + req.file.filename,
            Body:fs.createReadStream(req.file.path),
        }
        const result = await s3.upload(uploadParams).promise();
        console.log(req.body);
        console.log(result);
        res.redirect('/emailsucceed')
    } catch (e) {
        console.log(e);
        res.redirect('/emailfailed')
    }
})



module.exports = router;