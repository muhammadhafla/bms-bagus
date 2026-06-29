async function run() {
  const res = await fetch("https://bms.gayabagus.shop/api/users", {
    "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
        "Accept": "*/*",
        "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjUxYTBiOTdhLWYwMGYtNDNkZC05Zjk0LTkzOWJhMjFjNTkzNyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xldHhhZ3BtcnVtd2NqdXpydXlnLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhYzRkZTNhYy0zM2E5LTQ2NmEtYWM5Yi1kMTkxMTNhMGY2MWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNjU0MDMwLCJpYXQiOjE3ODI2NTA0MzAsImVtYWlsIjoibXVoYW1tYWRoYWZsYUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ2NDE5MH1dLCJzZXNzaW9uX2lkIjoiMDIxOGFjNzgtNmY5Mi00NWUyLTk5YTQtOWEwMTI2YzBkZGRmIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.KBXqovbwAC3hzO6fGaSNR04vXHbNZSOTh34lX1wjx8h74t9XLW4LbY5OxOmW4o83VN9WQyhXSEBTQTaus96q7A"
    },
    "body": "{\"email\":\"owner@gayabagus.shop\",\"username\":\"hakim\",\"nama\":\"m hakim\",\"password\":\"000000\",\"role\":\"admin\"}",
    "method": "POST"
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

run();
