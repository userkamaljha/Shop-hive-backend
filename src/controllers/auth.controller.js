import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'
import sendMail from '../middlewares/services/common.js'
import crypto from "crypto"


let generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, 'something went wrong, while creating access and refresh token')
    }
}


const createUser = asyncHandler(async (req, res) => {
    const user = new User(req.body);
try {
        if (user.password & user.email == '') {
            throw new ApiError(400, 'All fields are requried!')
        }
    
        const existedUser = await User.findOne({
            $or: [{ email: user.email }]
        })
    
        if (existedUser) {
            throw new ApiError(409, "User with email already exists")
        }
        const docs = await User.create(user)
    
        const createdUser = await User.findById(docs._id).select(
            "-password "
        )
         console.log(createUser);
        if (!createdUser) {
            throw new ApiError(500, "getting error while registering the user")
        }
    
      const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(createdUser._id)
         
        const options = {
            httpOnly: true,
            secure: true
        }
        return res.status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", refreshToken, options)
         .json({ id: createdUser.id, role: createdUser.role })

      } catch (error) {
        res.status(400)
        .json(error.message)
        }

})

const loginUser = asyncHandler(async (req, res) => {

    const user = req.body

   try {
     if (!user.email) {
         throw new ApiError(400, "email or password is required!")
     }
 
     let existedUser = await User.findOne(
         { $or: [{ email: user.email }] }
     )
 
     if (!existedUser) {
         throw new ApiError(409, "User does not exists")
     }
 
     let isPasswordValid = await existedUser.isPasswordCorrect(user.password)
 
     if (!isPasswordValid) {
         throw new ApiError(400, 'Invaild credentials')
     }
 
     const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(existedUser._id)
 
     let loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")
 
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     return res.status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", refreshToken, options)
         .json({ id: loggedInUser.id, role: loggedInUser.role })
   } catch (error) {
   res.status(400)
   .json(error.message)
   }

})

const checkAuth = async (req, res) => {
    const user = req.user
    if (user) {
        return res.status(200)
            .json({ id: user.id, role: user.role })
    } else {
        res.sendStatus(401);
    }
};

const logoutUser = asyncHandler(async (req, res) => {
    try {
        const { id } = req.user;

        const user = await User.findByIdAndUpdate(
            id,
            { $unset: { refreshToken: 1 } },
            { new: true }
        );
        const options = {
            httpOnly: true,
            secure: true
        };

        res.setHeader('Cache-Control', 'no-store');

        res.clearCookie("accessToken", options);
        res.clearCookie("refreshToken", options);
        res.sendStatus(200); // Send a 200 OK status

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" }); // Handle any errors
    }
});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, 'unauthorized request')
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        let user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token ")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used ")
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user?._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || 'Invaild refresh Token')
    }
})

const resetPasswordRequest = async (req, res) => {
    const email = req.body.email;
  const user = await User.findOne({ email: email });
  if (user) {
    const token = crypto.randomBytes(48).toString('hex');
    user.resetPasswordToken = token;
    await user.save();

    // Also set token in email
    const resetPageLink =
        'https://shop-hive-backend-1.onrender.com/reset-password?token=' + token + '&email=' + email;
    const subject = 'reset password for e-commerce';
    const html = `<p>Click <a href='${resetPageLink}'>here</a> to Reset Password</p>`;

    // lets send email and a token in the mail body so we can verify that user has clicked right link

    if (email) {
      const response = await sendMail({ to: email, subject, html });
      res.json(response);
    } else {
      res.sendStatus(400);
    }
  } else {
    res.sendStatus(400);
  }
};

const resetPassword = async(req,res)=>{
    const {email, password , token, } = req.body
    const user = await User.findOne({ email: email, resetPasswordToken: token });
    if (user) {
          user.password = password
            await user.save();
            const subject = 'password successfully reset for Shop Hive ';
            const html = `<h3>Successfully able to Reset Password</h3>`;
            if (email) {
              const response = await sendMail({ to: email, subject, html });
              res.json(response);
            } else {
              res.sendStatus(400);
            }
          }
       else {
        res.sendStatus(400);
      }
}

export { createUser, loginUser, logoutUser, refreshAccessToken, checkAuth, resetPasswordRequest, resetPassword}