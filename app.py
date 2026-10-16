import os
import re
import json
from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client

app = Flask(__name__, static_folder='static', template_folder='templates')

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k, v)

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

SYSTEM_DOMAINS = {
    "idms.eu.cc": "Public Domain",
    "bbinl.site": "Public Domain"
}

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    try:
        # Determine the redirect URL dynamically
        redirect_to = request.headers.get("Origin") or request.url_root
        
        res = supabase.auth.sign_up({
            "email": data['email'], 
            "password": data['password'],
            "options": {"redirect_to": redirect_to}
        })
        if res.session is None:
            return jsonify({"error": "Signup successful! Check your email for verification link, or disable 'Confirm email' in Supabase."}), 400
        return jsonify({"user": res.user.id, "session": res.session.access_token})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    try:
        res = supabase.auth.sign_in_with_password({"email": data['email'], "password": data['password']})
        return jsonify({"user": res.user.id, "session": res.session.access_token})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/domains', methods=['GET'])
def get_user_domains():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        token = auth_header.split(" ")[1]
        user_res = supabase.auth.get_user(token)
        user_id = user_res.user.id
        domains = supabase.table('domains').select("*").eq("user_id", user_id).execute()
        return jsonify(domains.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 401

@app.route('/api/domains/add', methods=['POST'])
def add_domain():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        token = auth_header.split(" ")[1]
        user_res = supabase.auth.get_user(token)
        user_id = user_res.user.id
        
        data = request.json
        domain_name = data.get("domain", "").strip().lower()
        if not domain_name:
            return jsonify({"error": "Domain is required"}), 400
            
        insert_data = {
            "user_id": user_id,
            "domain": domain_name,
            "is_public": data.get('is_public', False)
        }
        res = supabase.table('domains').insert(insert_data).execute()
        return jsonify(res.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/domains/<domain_id>', methods=['DELETE'])
def delete_domain(domain_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_res = supabase.auth.get_user(auth_header.split(" ")[1])
        supabase.table('domains').delete().eq('id', domain_id).eq('user_id', user_res.user.id).execute()
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route('/api/domains/<domain_id>/toggle_visibility', methods=['PUT'])
def toggle_visibility(domain_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_res = supabase.auth.get_user(auth_header.split(" ")[1])
        supabase.table('domains').update({'is_public': request.json.get('is_public')}).eq('id', domain_id).eq('user_id', user_res.user.id).execute()
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route('/api/domains/public', methods=['GET'])
def get_public_domains():
    public_list = list(SYSTEM_DOMAINS.keys())
    user_id = None
    
    auth_header = request.headers.get("Authorization")
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            user_res = supabase.auth.get_user(token)
            user_id = user_res.user.id
        except: pass

    try:
        domains = supabase.table('domains').select("domain").eq("is_public", True).execute()
        db_list = [d['domain'] for d in domains.data]
        public_list.extend(db_list)
        
        if user_id:
            private_domains = supabase.table('domains').select("domain").eq("is_public", False).eq("user_id", user_id).execute()
            private_list = [d['domain'] for d in private_domains.data]
            public_list.extend(private_list)
            
        return jsonify(list(dict.fromkeys(public_list)))
    except:
        return jsonify(list(dict.fromkeys(public_list)))

@app.route('/api/get_emails')
def get_emails():
    target_email = request.args.get('email')
    if not target_email:
        return jsonify({"error": "No email provided", "emails": []}), 400

    try:
        res = supabase.table("emails").select("*").eq("to_email", target_email).order("created_at", desc=True).limit(20).execute()
        
        email_list = []
        for row in res.data:
            email_list.append({
                "id": row['id'],
                "subject": row['subject'],
                "from": row['from_header'],
                "date": row['created_at'],
                "snippet": row['snippet'],
                "html": row['body_html'],
                "attachments": [] # Attachments could be added later if stored in Supabase Storage
            })
            
        return jsonify({"emails": email_list})

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}", "emails": []}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)