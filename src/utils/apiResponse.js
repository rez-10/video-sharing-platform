class ApiResponse {
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = (statusCode < 299) && (statusCode>200) 
    }
}

export { ApiResponse }