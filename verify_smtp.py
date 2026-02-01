import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("MAIL_USERNAME", "")
pwd = os.getenv("MAIL_PASSWORD", "")

print(f"User: '{user}' (Length: {len(user)})")
print(f"Pass: '{pwd}' (Length: {len(pwd)})")

try:
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(user.strip(), pwd.strip())
    print("✅ SMTP Login Successful!")
    server.quit()
except Exception as e:
    print(f"❌ Login Failed: {e}")
