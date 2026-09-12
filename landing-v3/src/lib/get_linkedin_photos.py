# Allows you to auto download people's linkedin profile picture easily, just insert your linkedin cookie from your browser

import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import json
import html

def extract_profile_image_from_voyager(soup):
    scripts = soup.find_all("script", type="application/json")
    print(scripts)

    for script in scripts:
        try:
            data = json.loads(script.string)
        except Exception:
            continue

        # Traverse recursively because nesting depth varies
        stack = [data]
        while stack:
            node = stack.pop()

            if isinstance(node, dict):
                # Found profilePicture vectorImage
                vector = (
                    node.get("profilePicture", {})
                        .get("displayImageReferenceResolutionResult", {})
                        .get("vectorImage")
                )

                if vector:
                    root_url = vector.get("rootUrl")
                    artifacts = vector.get("artifacts", [])

                    if root_url and artifacts:
                        # Choose highest resolution available
                        best = max(
                            artifacts,
                            key=lambda a: a.get("width", 0)
                        )

                        path = best.get("fileIdentifyingUrlPathSegment")
                        if path:
                            return html.unescape(root_url + path)

                stack.extend(node.values())

            elif isinstance(node, list):
                stack.extend(node)

    return None

# ------------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------------

# Export your LinkedIn cookies as a single "Cookie" header string
LINKEDIN_COOKIE = "bcookie=\"v=2&0b0d10df-89ff-4134-8388-6650b28a8741\"; bscookie=\"v=1&2025052819543332810500-6d23-476d-8667-081bbae273bfAQGjsLFTRNdvjQ0_EGL5aU-RT81X1-Wm\"; JSESSIONID=\"ajax:8636117659840921572\"; dfpfpt=28389325b5474a3f82342bd3315b8b9e; li_theme=dark; li_theme_set=user; liap=true; _uetvid=279a5c907c5811f09c26258c9d54f71b; l_page=https://www.linkedin.com/jobs/view/4309085691/?fbclid=PAZXh0bgNhZW0CMTEAAad3r_m2lacf37MFuhTBFwBViWucEY-xZ9UvylviiVmXeCDVR-ST_D8KoqK6ZQ_aem_kIG9-8MYlCenoNO9CTmIVQ; _pxvid=9560f333-3bfd-11f0-b860-a8550f8e4222; sdui_ver=sdui-flagship:0.1.19827-6+SduiFlagship0; mbox=session#d7bf223fecb74241934ed7452d06538a#1765333928|PC#d7bf223fecb74241934ed7452d06538a.34_0#1780884068; s_ips=1098.6666717529297; gpv_pn=www.linkedin.com%2Flearning%2Fid-redacted; s_tp=3529; s_tslv=1765332094585; AMCV_14215E3D5995C57C0A495C55%40AdobeOrg=-637568504%7CMCIDTS%7C20433%7CMCMID%7C91325323804528138874770281703012308253%7CMCOPTOUT-1765339294s%7CNONE%7CvVersion%7C5.1.1; li_sugr=e99890e8-e620-486e-b209-e664d2b15382; lang=v=2&lang=en-us; li_at=AQEDAUoVdAoDKRQAAAABmKcgI2wAAAGcFQxJg04AEwrbfHYcfJ3bmP1atZy8kk1KV6J4RZqsw8Jj3T1s32Ihuj1pT48CLHuavpY3miLg5YPx7fHDmWxjPIaHMqLvLkdXaWgXEv2DBddiOKK7RTWoMADk; lidc=\"b=TB46:s=T:r=T:a=T:p=T:g=1044:u=351:x=1:i=1769274852:t=1769278986:v=2:sig=AQG-eFLgMVHq2KSkQ-5qx_C_cqkv91ie\"; __cf_bm=K6agaoPwvn2u3bOH9QVEAYMSmBkS7MAsXl3VHbdOM8Q-1769274852-1.0.1.1-KnL6ntRLsfjsUiI.HF1mR1V4Z04sSU3jtJjPWBKW4cHTQG3aLelE_VJi6o.HWNgpRy5PLm6dMv61U2tXdOKbYm.h2hRMr5OcDCI1ry3NUII; timezone=America/New_York; fptctx2=taBcrIH61PuCVH7eNCyH0FC0izOzUpX5wN2Z%252b5egc%252f5cWCsd3HgOGXCFu34u4odEge3MTj1t7knJbk5cFSM62tohM1LHS3LSCEnxEFtbwN8A487KP6mAWFvApcdsn8%252fbh08kWGTI3rpMPP%252fmewm2%252b79Grdqsjw1c7HCwarW9qjMBChZ12ZB1P%252buCM3Rx2A4%252biD0I2qI%252btTDP%252b0aNmlXC1oeSs9yUFCBu2Pwt2BUlOAzqeDs%252fe0RKKotHSRyP2XZ8Z9lzWFikor6Fz9WY4mdo2e7g%252fR6LnRl577gJonKBa8%252b5zbcsG8gEhXYh37HurNUJYjnV5I0eZ546Ju%252fBtxmEEgA%252bP6LEf%252bHartNJlyAcXeg%253d; UserMatchHistory=AQIe8KnjOx3lRgAAAZvw__F5pDtpQlyYivn3teQxgmTcRi7nZudkVdjaXY9K5tdHA0CLuQ9h8cKJCeMCIxge3wFvMN21bXDLuExz7iM2yiPVMxJ7y0FNxS7jxwmiybYeuAprJa7hRAk4gYL59fmDBWRLg1uIAMFMkAnYzY-5lp9SYZHKTVyS-ahrXd2ry_f6MUV-4Dt-q736YDPmjryk6Xq7j_K3pDMJ8atNGAyIgOYCG1kIT70CW2aoHbS7hg7Zhemhp5Q1E_Ks3xqO71udGW_sEK20PJJeQPx5neBnd88BPhyShMfHE4FC4_ijjMibkNEI9Xvwg6iPpeJsApCp"

if not LINKEDIN_COOKIE:
    raise RuntimeError("Set LINKEDIN_COOKIE environment variable")

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Cookie": LINKEDIN_COOKIE,
}

OUTPUT_DIR = "linkedin_photos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ------------------------------------------------------------------
# INPUT DATA
# ------------------------------------------------------------------

people = [
    {"first": "soham", "last": "katdare", "linkedin": "https://linkedin.com/in/sakatdare"},
    {"first": "kanhav", "last": "bhatnagar", "linkedin": "https://www.linkedin.com/in/bkanhav/"},
    {"first": "dev", "last": "patel", "linkedin": "https://www.linkedin.com/in/devpat23/"},
    {"first": "mouli", "last": "banga", "linkedin": "https://www.linkedin.com/in/mouli-banga/"},
    {"first": "aditya", "last": "tripathi", "linkedin": "https://www.linkedin.com/in/aditrip21/"},
    {"first": "katherine", "last": "hall", "linkedin": "https://www.linkedin.com/in/katherinehall206/"},
    {"first": "aarav", "last": "borthakur", "linkedin": "https://www.linkedin.com/in/aarav-borthakur/"},
    {"first": "allison", "last": "yu", "linkedin": "https://www.linkedin.com/in/allisonayu/"},
    {"first": "harini", "last": "thirukonda", "linkedin": "https://www.linkedin.com/in/harini-thirukonda-190036238/"},
    {"first": "agnik", "last": "banerjee", "linkedin": "https://www.linkedin.com/in/agnikbanerjee/"},
    {"first": "suneth", "last": "ramawickrama", "linkedin": "https://www.linkedin.com/in/suneth-ramawickrama/"},
    {"first": "nithin", "last": "bhandari", "linkedin": "https://www.linkedin.com/in/nithinbhandari/"},
    {"first": "rivan", "last": "parikh", "linkedin": "https://www.linkedin.com/in/rivan-parikh/"},
    {"first": "amogh", "last": "samaga", "linkedin": "https://www.linkedin.com/in/amogh-samaga/"},
    {"first": "aprameya", "last": "kannan", "linkedin": "https://www.linkedin.com/in/aprameyak/"},
    {"first": "sidharth", "last": "ponram", "linkedin": "https://www.linkedin.com/in/sidharthponram/"}
]





# ----------------------------
# HELPERS
# ----------------------------

def get_extension(url):
    path = urlparse(url).path
    ext = os.path.splitext(path)[1]
    return ext.lstrip(".") or "jpg"


def extract_image_url_from_voyager(soup):
    code_tags = soup.find_all("code")

    for code in code_tags:
        if not code.string:
            continue
        
        # put your linkedin hash here instead of this current one or else itll download just your pic
        if "profile-displayphoto-" not in code.string or "D4E03AQGay5Bf0OlLVA" in code.string:
            continue

        try:
            data = json.loads(code.string)
        except Exception:
            continue

        stack = [data]

        while stack:
            node = stack.pop()

            if isinstance(node, dict):
                vector = (
                    node.get("profilePicture", {})
                        .get("displayImageReferenceResolutionResult", {})
                        .get("vectorImage")
                )

                if vector:
                    root_url = vector.get("rootUrl")
                    artifacts = vector.get("artifacts", [])

                    if root_url and artifacts:
                        best = max(artifacts, key=lambda a: a.get("width", 0))
                        path = best.get("fileIdentifyingUrlPathSegment")
                        if path:
                            return html.unescape(root_url + path)

                stack.extend(node.values())

            elif isinstance(node, list):
                stack.extend(node)

    return None


def download_image(url, path):
    r = requests.get(url, headers=HEADERS, stream=True)
    r.raise_for_status()
    with open(path, "wb") as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)

# ----------------------------
# MAIN
# ----------------------------

for person in people:
    first = person["first"]
    last = person["last"]
    url = person["linkedin"]

    print(f"Fetching {first} {last}...")

    page = requests.get(url, headers=HEADERS)
    page.raise_for_status()

    # Save raw HTML
    with open("raw_soup.txt", "w", encoding="utf-8") as f:
        f.write(page.text)

    soup = BeautifulSoup(page.text, "html.parser")

    image_url = extract_image_url_from_voyager(soup)
    if not image_url:
        print("  ❌ No profile image found")
        continue

    ext = get_extension(image_url)
    filename = f"{first}{last}.{ext}"
    filepath = os.path.join(OUTPUT_DIR, filename)

    download_image(image_url, filepath)
    print(f"  ✅ Saved {filename}")