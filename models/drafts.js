const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema({
    _id:mongoose.Schema.Types.ObjectId,
    caption:String,
    username:String,
    image: String,
    uploadedDate: String
})

module.exports = mongoose.model('drafts', draftSchema);