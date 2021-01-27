# Photos App:

- Tech-stack used:
    JavasScript based backend (Node.js, Express.js)
    MongoDB as a nosql database (MongoDB Atlas, Mongoose)

- API is Hosted on: https://salty-lake-44679.herokuapp.com/images

- API ENDPOINTS:

0. /images (a GET req): This route is our home route where all posted photos will be listed. This request does not need a user to be logged-in.

1. /register (a POST req): (jwt-authentication)For performing any operation on this App, user first needs to register with below mandatory parameters: { "email":< email e.g. "test1@gmail.com" >, "password":<password : e.g. "test">, "name":<e.g. "test"> } response : On successful registration, user will get "access_token" to start further operations. Please store "access_toekn" in Authorization header as : key : Authorization , Value : Bearer {{access_token}} All operation will be followed with this access tokens. For this App I have set access_token validity to 10 mins.

2. /login (a POST req): (jwt-authentication) User can login with registerd email and password in request body. response: On successful login, user will get "access_token" to start further operations. Please store "access_toekn" in Authorization header as : key : Authorization , Value : Bearer {{access_token}} All operation will be followed with this access tokens.

3. /upload (a POST req): It will upload photo provided by logged-in user in body as file parameter in form-data : request-body: form data -> {key : image, value : .png/.jpeg} along with username and caption. The uploaded photo will be first saved as a Draft.

4. /post/:id (a POST req): The photo which was uploaded in drafts will be posted. request-body: 'id' must be provided in route parameters to post a photo.

5. /images/:username (a GET req): Filter Photos by User. request-body: 'username' must be provided in route parameter. (and this same route can be used to get all myPhotos)

6. /draft/:username (a GET req): Get all draft Photos of a user. request-body: 'username' must be provided in route parameter.

7. /images/:id (a PATCH req): Edit Photo Caption of a posted photo. request-body: Photo id must be provided in route parameter.

8. /images/:id (a DELETE req): Delete a selected Photo from Posted Photos. request-body: Photo id must be provided in route parameter.

9. /draft/:id (a DELETE req): (same as /images/:id)Delete a selected Photo from Draft Photos. request-body: Photo id must be provided in route parameter.

10. /images/batchremove/:username (a DELETE req): Logged-in Users can DELETE all their Posted Photos. request-body: Name of user must be provided in route parameter.

11. /images/sort/:order (a GET req):  Get Photos by ASC/DESC order of uploaded Date. request-body: ASC/DESC must be provided in route parameter.
