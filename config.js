const config = {
  app: {
    key: "rushikesh",
    algo: "aes256",
    jwtKey: "jwt",
    port: 5000,
    loggedInUserName: "",
  },
  db: {
    mongoURI:
      "mongodb+srv://rushi:431714@cluster0.jcpwl.mongodb.net/hmletbackend?retryWrites=true&w=majority",
  },
};

module.exports = config;
