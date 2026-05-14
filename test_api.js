async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/analytics?userId=test-deneme-uuid-1');
    const data = await res.text();
    console.log(res.status);
    console.log(data);
  } catch (e) {
    console.log(e);
  }
}
run();
