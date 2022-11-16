const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')
const saltfactor = 10

const page = new Schema({
    isBundle: Boolean,
    name: String,
    page: String,
    js: String,
    css: String
  })

const menu = new Schema({
  menu: String
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
    password: String,
    superAdmin: Boolean,
    access: String,
    projects: Array,
    isBackendUser: Boolean
  })

  const customComponent = new Schema({
    framework: String,
    scriptName: String,
    path: String,
    scriptContent: String,
    attachedCSS: String,
    project: String,
  })
  const projects = new Schema({
    name: String,
    framework: String,
    source: String,
    participants: Array
  })
  
  const customComponentsdb = mongoose.model('custom-components', customComponent)

  const pagedb = mongoose.model('pages', page)

  const menudb = mongoose.model('menus', menu)

  const userdb = mongoose.model('users', user)

  const projectsdb = mongoose.model('projects', projects)

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

  module.exports = {pagedb, menudb, userdb, admindb, customComponentsdb, projectsdb}