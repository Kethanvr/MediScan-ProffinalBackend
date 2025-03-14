import {v2 as cloudinary} from 'cloudinary'
import fs from 'node:fs'
// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const Uploder = async (localfilepath) => {
try {
    if(!localfilepath){
        return null
    }
    const response = await cloudinary.v2.uploder.upload(localfilepath)
    console.log('file uploaded successfully',response.url)
    return response
} catch (error) {
    fs.unlinkSync(localfilepath)
}
}