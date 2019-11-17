const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')
const saltfactor = 10

const page = new Schema({
    name: String,
    page: String,
    js: String,
    css: String
  })

  const user = new Schema({
    firstname: String,
    lastname: String,
    email: String,
    firstMessage: String,
    messagesHistory: Array
  })

  const admin = new Schema({
    xcmsAdmin: String,
    password: String
  })

  const pagedb = mongoose.model('pages', page)

  const userdb = mongoose.model('users', user)

  

  admin.pre('save', function(next){
  var user = this;
  if(!user.isModified('password')) return next();
  bcrypt.genSalt(saltfactor, function(err, salt){
    if(err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash){
      if(err) return next(err);
      user.password = hash;
      next();
    })
  })
})

admin.methods.comparePassword = function(candidatePassword, cb){
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch){
    if(err) return next(err);
    cb(null, isMatch)
  })
}

const admindb = mongoose.model('admins', admin)

  module.exports = {pagedb, userdb, admindb}