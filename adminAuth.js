const {admindb} = require('./cmsModels.js') 
const passport = require('koa-passport')
const LocalStrategy = require('passport-local').Strategy

passport.serializeUser(function(user, done) {
  done(null, user._id, user.xcmsAdmin)
})

passport.deserializeUser(async function(id, done) {
  admindb.findById(id, (err, user)=>{
    done(err, user)
  })
})
passport.use(new LocalStrategy(function(username, password, done) {
  admindb.findOne({xcmsAdmin: username}, (err, res)=>{
    if(res === null){
      return done(null, false)
    }else{
      res.comparePassword(password, (err, isMatch)=>{
        if(isMatch){
          console.log('valid', res.xcmsAdmin)
          done(null, res)
        }else{
          console.log('invalid')
          done(null, false)
        }
      })
    }
  })
}))