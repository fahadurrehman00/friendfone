require('./connection/connection');
var express = require("express"),

	app = express(),

	bodyParser = require("body-parser"),
	
	cookieParser = require('cookie-parser'),
	
	flash = require("connect-flash"),
		
	passport = require("passport"),
	
	LocalStrategy = require("passport-local").Strategy,
	
	methodOverride = require("method-override"),
	
	User = require("./models/user"),
	
	homeRoutes = require("./routes/home"),
	
	indexRoutes = require("./routes/index"),
	
 	appointments = require("./routes/appointments"),
		
 	adminRoutes = require("./routes/admin"),
	
	adminNotes = require("./routes/notes"),
	
	adminCode = require("./routes/codes"),

	customerRoutes = require("./routes/customer"),
	
	conciergeRoutes = require("./routes/concierge"),
	
 	scheduler = require("./scheduler")	

app.disable('x-powered-by');

//aws throw an error if file size get bigger than 1mb before as this is the default nginx setting
// however I change the setting and now anyone can upload size larger than this.
//also i remain the limit 50 mb as currently the application does not need more data in req body.
// however if you need to expand it just remove the limit property.

app.use(bodyParser.urlencoded( {extended: true,limit:'50mb'} ) );
app.use(bodyParser.json({limit:'50mb'}));


app.use(cookieParser());

app.set('views', __dirname + '/views');

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));

app.use(methodOverride("_method"));

app.locals.moment = require('moment');

app.locals.momentTimeZone = require('moment-timezone');

app.use(methodOverride("_method"));

app.use(flash());


//PASSPORT CONFIGURATION

app.use(require("express-session")({
	secret:process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: process.env.USERNAME_FIELD,
		passwordField: process.env.PASSWORD_FIELD,
  },User.authenticate()));


passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	// for finding heading value we also set url variable 
	var mainUrl = req.url.slice(1,);
	var pathname = (' '+mainUrl).replace( /-/g, ' ' ).replace(/ [\w]/g, a => a.toLocaleUpperCase()).trim();
	// mainUrl.replace(mainUrl[0], mainUrl[0].toUpperCase() )
	res.locals.pathname = ( req.url === '/' || req.url === '/home') ? '/' : pathname;

	// these are the headlines you see on the main section of every page
	res.locals.headlines = {
		"/": "Help Your Little One Stay Safe & Productive",
		"Customers":"FriendFone Offers A Solution Designed To Help Most Industries",
		"Concierge":"We Have A Dedicated Team Designed Specifically To Help You While You're On The Go",
		"Pricing":"FriendFone Offers Pricing Starting At Just 11 Cents Per Day",
		"Blog":"Find Out Whats's Going On In The Industry",
		"Career":"Looking To Join A Dedicated Team? Yo're In The Right Place",
		"Support":"From Questions To Comments, Our Team Is Here to Help",
		"Privacy Policy":"Your privacy is important to us.",
		"Terms And Conditions":"By using our website, you accept these terms and conditions in full.",
		"Compliance Legal and Policies":"...",
	}
	next();	
});

app.use("/", indexRoutes);

app.use("/home", homeRoutes);

app.use('/appointments', appointments);

app.use('/admin', adminRoutes);

app.use('/notes', adminNotes);

app.use('/codes', adminCode);

app.use('/customers', customerRoutes);

app.use('/concierge', conciergeRoutes);

app.get('/blog', (req,res) => {

	res.send('this page is under development.We will publish the page soon')

});


app.get('/career', (req,res) => {

	res.send('this page is under development.We will publish the page soon')

})

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', (req, res) => res.render("404"));

console.log(process.env);

app.listen(process.env.PORT || 8080, function(err) {
	if(err){
		console.log('error in listening');
		// console.log(err);
	}
  console.log("Friendfone Server started successfully!");
});




scheduler.start();

module.exports = app;