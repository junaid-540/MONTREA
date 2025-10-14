import passport from "passport";
import{Strategy as GoogleStrategy} from 'passport-google-oauth20'
import User from "../models/userSchema.js";
import dotenv from 'dotenv';

dotenv.config()

passport.use(
    new GoogleStrategy({
        clientID : process.env.CLIENT_ID,
        clientSecret : process.env.CLIENT_SECRET,
        callbackURL : process.env.CALLBACK_URL
    },

        async(accessToken,refreshToken,profile,done) =>{

            try {
                
                let user = await User.findOne({googleId:profile.id});

                if(!user){
                    user = await User.create({
                        name: profile.displayName,
                        email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
                        googleId: profile.id,
                        isVerified: true,
                        password:null,
                    });
                }

                return done(null,user);

            } catch (err) {

                console.error("Error in GoogleStrategy :", err)
                return done(err,null);
                
            }

        }

    )
);



passport.serializeUser((user,done)=>{
    done(null,user._id);
})

passport.deserializeUser( async (id,done)=>{

    try {
        
        const user = await User.findById(id)
        done(null,user)
    } catch (err) {
        
        done(err,null)
    }

})





export default passport;