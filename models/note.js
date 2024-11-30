const mongoose = require('mongoose');
const NoteSchema = new mongoose.Schema({
  notes: String,
	 author: {
		 type: mongoose.Schema.Types.ObjectId,
		  ref: "User"
			},
});

const Note = mongoose.model('note', NoteSchema);

module.exports = Note;
