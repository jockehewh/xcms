const mongoose = require('mongoose')
const Schema = mongoose.Schema

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

  const userdb = mongoose.model('pages', user)

  const admindb = mongoose.model('pages', admin)

  module.exports = {pagedb, userdb, admindb}