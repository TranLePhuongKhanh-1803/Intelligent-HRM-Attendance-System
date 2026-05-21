const axios = require('axios');

async function test() {
  const img1 = await axios.get('https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img1.jpg', { responseType: 'arraybuffer' });
  const b64_1 = Buffer.from(img1.data).toString('base64');

  const img3 = await axios.get('https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img3.jpg', { responseType: 'arraybuffer' });
  const b64_3 = Buffer.from(img3.data).toString('base64');

  const img1_alt = await axios.get('https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img2.jpg', { responseType: 'arraybuffer' });
  const b64_1_alt = Buffer.from(img1_alt.data).toString('base64');

  let e1, e3, e1_alt;
  try {
    const res1 = await axios.post('http://127.0.0.1:8000/represent', { image_base64: b64_1 });
    e1 = res1.data.embedding;
    const res2 = await axios.post('http://127.0.0.1:8000/represent', { image_base64: b64_3 });
    e3 = res2.data.embedding;
    const res3 = await axios.post('http://127.0.0.1:8000/represent', { image_base64: b64_1_alt });
    e1_alt = res3.data.embedding;
  } catch(e) {
    console.error('API error', e.message); return;
  }

  const calcDist = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  const dist_diff = calcDist(e1, e3);
  const dist_same = calcDist(e1, e1_alt);

  console.log('Distance between DIFFERENT faces:', dist_diff);
  console.log('Distance between SAME faces:', dist_same);
}
test();
