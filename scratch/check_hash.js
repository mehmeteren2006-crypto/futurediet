const bcryptjs = require("bcryptjs");

async function check() {
  const match = await bcryptjs.compare("123456", "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa");
  console.log("MATCH:", match);
  const hash = await bcryptjs.hash("123456", 10);
  console.log("NEW HASH:", hash);
}
check();
