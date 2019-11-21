const {admindb} = require('./cmsModels.js') 
const passport = require('koa-passport')
const LocalStrategy = require('passport-local').Strategy

admindb.find({}, (err, res)=>{
  if(err)console.log(err)
  if(res.length > 0){
    return
  }else{
    const defaultAdmin = new admindb({
      xcmsAdmin: 'superuser',
      password: '2one0time1password9'
    })
    defaultAdmin.save((err, res)=>{
      if(err) console.log(err)
      if(res) console.log(res)
    })
  }
})

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
          done(null, res)
        }else{
          done(null, false)
        }
      })
    }
  })
}))