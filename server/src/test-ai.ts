// Chỉ test API Gemini, không liên quan đến type của dự án
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

async function testGeminiAPI() {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  if (!apiKey || !apiUrl) {
    console.error('Chưa cấu hình API KEY hoặc URL');
    return;
  }

  const prompt = 'Giải thích AI là gì bằng tiếng Việt đơn giản.';
  try {
    const response = await axios.post(
      `${apiUrl}?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    console.log('Full response from Gemini API:', JSON.stringify(response.data, null, 2));
    // Thử lấy các trường khác nhau
    const answer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || response.data?.candidates?.[0]?.content?.text
      || response.data?.candidates?.[0]?.output
      || 'Không có kết quả từ Gemini AI';
    console.log('Kết quả từ Gemini AI:\n', answer);
  } catch (err: any) {
    console.error('Lỗi gọi Gemini API:', err.message);
  }
}

testGeminiAPI();