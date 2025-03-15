class ApiResponse {
    constructor(statusCode, message = 'Sucess', data = null, errors = []) {
      this.statusCode = statusCode;
      this.message = message;
      this.data = data;
      this.errors = errors;
      this.sucess = statusCode >= 200 && statusCode < 300;
    }
  } 
  
export default ApiResponse;