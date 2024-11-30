const mongoose = require('mongoose');

mongoose.connect((process.env.DATABASEURL),{
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
})
.then(res => {
	console.log('DB connected successfully');
})
.catch(e => {
	console.log(e);
})