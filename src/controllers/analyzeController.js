import { GoogleGenerativeAI } from "@google/generative-ai";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to validate base64 image
function isValidBase64Image(base64String) {
  try {
    // Check if it's a valid base64 string
    if (!base64String.includes(";base64,")) {
      return false;
    }

    // Extract the actual base64 data
    const base64Data = base64String.split(";base64,")[1];

    // Try to decode it
    atob(base64Data);
    return true;
  } catch (error) {
    return false;
  }
}

// Analyze image using Gemini
export const analyzeImage = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image) {
      throw new ApiError(400, "Image is required");
    }

    if (!isValidBase64Image(image)) {
      throw new ApiError(400, "Invalid image format");
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-thinking-exp-01-21",
    });

    const prompt = `I am building a medicine scanning application. Your task is to analyze the uploaded image of a medicine (packaging, label, or leaflet) and extract detailed information to populate the following JSON structure. Use data from the text in the image, online databases, or relevant sources. If the medicine name is identified, use it to search the web for additional information to populate the JSON structure comprehensively. If any key or value cannot be determined, generate a Google search URL for the medicine name under the search key to allow further exploration. The goal is to provide accurate, reliable, and actionable information. Leave fields empty only if absolutely no information can be found.

    Information to Extract and JSON Structure to Populate:
    
    {
      "product_identification": {
        "medicine_name": "Extract the name of the medicine as written on the packaging or label. Use this name to perform additional web searches if found.",
        "brands": "Extract the brand or manufacturer name if available.",
        "dosage_form": "Extract the form of the medicine .",
        "strength": "Extract the strength or concentration of the active ingredient .",
        "code": "Extract the barcode or unique identifier if available."
      },
      "ingredients_and_allergens": {
        "active_ingredients": "Extract the names of active ingredients along with their respective amounts or concentrations (return in a string format ).",
        "inactive_ingredients": "Extract the names of inactive or non-medicinal ingredients.",
        "allergens": "Extract information about potential allergens mentioned on the label.",
        "warnings": "Extract safety warnings, contraindications, or precautionary statements."
      },
      "usage_information": {
        "indications": "Extract the therapeutic uses or conditions for which this medicine is intended.",
        "directions_for_use": "Extract the dosage instructions from web.", 
        "contraindications": "Extract any conditions under which the medicine should not be used.",
        "side_effects": "Extract the possible side effects listed on the packaging or leaflet.",
        "uses": "Extract the specific diseases or conditions the tablet is used to treat."
      },
      "pricing_information": {
        "price": "Extract the total price of the medicine if available.",
        "price_per_tablet": "Calculate the price per tablet if applicable."
      },
      "safety_and_storage": {
        "storage_conditions": "Extract the recommended storage conditions.",
        "manufacture_date": "Extract the manufacturing date if available.",
        "expiry_date": "Extract the expiration date mentioned on the packaging.",
        "warnings": "Extract safety-related warnings ."
      },
      "images": {
        "selected_images": {
          "image_url": "URL of the front image of the medicine package.",
          "image_label_url": "URL of the image showing the label with detailed information.",
          "image_packaging_url": "URL of the image showing the full packaging."
        }
      },
      "additional_details": {
        "categories": "Extract the category or classification of the medicine.",
        "manufacturer": "Extract the name of the manufacturer.",
        "batch_number": "Extract the manufacturing batch number."
      },
      "search": {
        "google_search_url": "https://www.google.com/search?q=<medicine_name>"
      }
    }
    
    Key Instructions for AI Model:
    remember that this usage_information: {
        indications: null,
        directions_for_use: ' Extract the dosage instructions from web.',
        contraindications: null,
        side_effects: null,
        uses: null
      }, is most importane this field u have to fill it with the help of google search as this my application is based on this field
    
    URL Encoding for Google Search:
    In the google_search_url, make sure the product name is URL-encoded to replace spaces with %20 for proper formatting
    
    Perform OCR (Optical Character Recognition) on the uploaded image to extract text.
    Identify the medicine name and use it to search the web for additional information, including its uses, pricing, and diseases it treats. Use trusted sources like FDA, WHO, or official medicine websites.
    Populate the google_search_url field dynamically with a Google search URL using the medicine name (e.g., https://www.google.com/search?q=Paracetamol).
    If any field cannot be determined from the image, attempt to fill it using online searches or database lookups.
    Populate the JSON structure using both extracted and fetched information. Include the search URL even if some fields are successfully populated, as additional context may be helpful.
    Ensure the data is formatted exactly as per the JSON structure, with no extra fields added.
    
    Note:
        Return only valid JSON without any markdown formatting.`;

    // Generate content
    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    const text = response.text();

    // Try to parse the response as JSON
    try {
      const jsonResponse = JSON.parse(text);
      res.json(new ApiResponse(200, "Analysis successful", jsonResponse));
    } catch (error) {
      throw new ApiError(500, "Failed to parse analysis results");
    }
  } catch (error) {
    next(error);
  }
};
