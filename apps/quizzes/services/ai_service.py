import os
import json
import requests
from django.conf import settings

class AIService:
    def __init__(self):
        self.api_key = getattr(settings, 'AI_API_KEY', None)
        self.provider = getattr(settings, 'AI_PROVIDER', 'groq')

    def generate_questions(self, topic, difficulty, count):
        prompt = f"""
        Generate {count} multiple choice questions on the topic '{topic}' at {difficulty} difficulty level.
        Return ONLY a valid JSON array of objects. Each object must have these exact keys:
        - "question_text": text of the question
        - "option_a": first option
        - "option_b": second option
        - "option_c": third option
        - "option_d": fourth option
        - "correct_option": one of "a", "b", "c", or "d"
        - "explanation": a brief explanation of why the answer is correct
        - "order": integer index starting from 1
        """

        if self.provider == 'groq':
            return self._generate_with_groq(prompt)
        elif self.provider == 'gemini':
            raise ValueError("Gemini provider is deprecated. Please use Groq.")
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    def _generate_with_groq(self, prompt):
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        data = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            text = result['choices'][0]['message']['content']
            
            # Find the JSON part in case the model returns extra conversational text
            start = text.find('[')
            end = text.rfind(']') + 1
            if start != -1 and end != -1:
                json_str = text[start:end]
                # strict=False allows unescaped control characters
                return json.loads(json_str, strict=False)
            else:
                raise ValueError("Could not find JSON in AI response")
        except requests.exceptions.HTTPError as e:
            print(f"Groq API HTTP Error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Groq API Error: {e.response.status_code}")
        except Exception as e:
            print(f"AI Generation Error: {str(e)}")
            raise e
