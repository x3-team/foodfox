# Prepares App Store signing for FoodFox on CI through the App Store Connect API, without
# Xcode's portal login (ported from x3-team/diggo-vpn app/scripts/asc-signing.rb):
#  - checks the API key and registers the App ID guru.yuri.foodfox if it is missing;
#  - finds or creates FoodFox's own Apple Distribution certificate. Its private key is derived
#    from the API key, so every run gets the same certificate and the team's certificate
#    limit is not used up. Other certificates on the team are only read, never changed;
#  - recreates the "FoodFox App Store" profile and looks up the App Store Connect app record.
# Writes distribution.key, distribution.cer and signing.env (KEY=VALUE lines) into <out dir>.
# Usage: ruby scripts/asc-signing.rb <AuthKey.p8> <key id> <issuer id> <out dir>
require 'base64'
require 'json'
require 'net/http'
require 'openssl'
require 'fileutils'

key_path, KEY_ID, ISSUER, out = ARGV
abort 'usage: asc-signing.rb <AuthKey.p8> <key id> <issuer id> <out dir>' unless out

BUNDLE_ID = 'guru.yuri.foodfox'
APP_NAME = 'FoodFox'
PROFILE_NAME = 'FoodFox App Store'
pem = File.read(key_path)
puts "key file: #{pem.lines.size} lines, " \
     "#{pem.start_with?('-----BEGIN PRIVATE KEY-----') ? 'PKCS#8 header ok' : 'unexpected header'}"
API_KEY = OpenSSL::PKey::EC.new(pem)

def b64(data)
  Base64.urlsafe_encode64(data, padding: false)
end

def token
  now = Time.now.to_i
  header = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }.to_json)
  payload = b64({ iss: ISSUER, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }.to_json)
  der = API_KEY.sign(OpenSSL::Digest.new('SHA256'), "#{header}.#{payload}")
  r, s = OpenSSL::ASN1.decode(der).value.map { |i| i.value.to_s(2).rjust(32, "\0") }
  "#{header}.#{payload}.#{b64(r + s)}"
end

def api(method, path, body = nil)
  uri = URI("https://api.appstoreconnect.apple.com#{path}")
  req = Net::HTTP.const_get(method.capitalize).new(uri)
  req['Authorization'] = "Bearer #{token}"
  if body
    req['Content-Type'] = 'application/json'
    req.body = body.to_json
  end
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
  data = res.body.to_s.empty? ? {} : JSON.parse(res.body)
  unless res.code.start_with?('2')
    errors = (data['errors'] || []).map { |e| "#{e['code']}: #{e['title']} #{e['detail']}" }
    raise "#{method.upcase} #{uri.path}: HTTP #{res.code} #{errors.join('; ')}"
  end
  data
end

def query(params)
  URI.encode_www_form(params)
end

# A signing key: RSA-2048 from primes drawn out of HMAC(API key) in counter mode. The label
# differs from Diggo's, so FoodFox gets its own certificate even with the same API key.
def distribution_key(label = 'foodfox-ios-distribution')
  seed = API_KEY.private_key.to_s(2)
  counter = 0
  stream = lambda do |n|
    bytes = ''.b
    while bytes.bytesize < n
      counter += 1
      bytes << OpenSSL::HMAC.digest('SHA256', seed, "#{label}-#{counter}")
    end
    bytes[0, n]
  end
  e = OpenSSL::BN.new(65_537)
  prime = lambda do
    loop do
      bytes = stream.call(128)
      bytes.setbyte(0, bytes.getbyte(0) | 0xC0)
      bytes.setbyte(127, bytes.getbyte(127) | 1)
      candidate = OpenSSL::BN.new(bytes, 2)
      return candidate if candidate.prime? && (candidate - 1).gcd(e) == 1
    end
  end
  p = prime.call
  q = prime.call
  q = prime.call while q == p
  d = e.mod_inverse((p - 1) * (q - 1))
  der = OpenSSL::ASN1::Sequence([0, p * q, e, d, p, q, d % (p - 1), d % (q - 1), q.mod_inverse(p)]
                                  .map { |i| OpenSSL::ASN1::Integer(OpenSSL::BN.new(i.to_s)) }).to_der
  OpenSSL::PKey::RSA.new(der)
end

def bundle_id
  found = api('get', "/v1/bundleIds?#{query('filter[identifier]' => BUNDLE_ID, 'limit' => 20)}")['data']
          .find { |d| d.dig('attributes', 'identifier') == BUNDLE_ID }
  if found
    puts "bundle id #{BUNDLE_ID}: exists"
    return found['id']
  end
  created = api('post', '/v1/bundleIds', data: {
                  type: 'bundleIds',
                  attributes: { identifier: BUNDLE_ID, name: APP_NAME, platform: 'IOS' }
                })
  puts "bundle id #{BUNDLE_ID}: created"
  created['data']['id']
end

def certificate(key)
  ours = key.public_key.to_der
  api('get', "/v1/certificates?#{query('filter[certificateType]' => 'DISTRIBUTION', 'limit' => 200)}")['data'].each do |c|
    cert = OpenSSL::X509::Certificate.new(Base64.decode64(c.dig('attributes', 'certificateContent')))
    next unless cert.public_key.to_der == ours
    next if cert.not_after < Time.now + 86_400

    puts "distribution certificate: FoodFox's own, valid until #{cert.not_after.strftime('%Y-%m-%d')}"
    return [c['id'], cert]
  end
  csr = OpenSSL::X509::Request.new
  csr.version = 0
  csr.subject = OpenSSL::X509::Name.parse('/CN=FoodFox CI')
  csr.public_key = key
  csr.sign(key, OpenSSL::Digest.new('SHA256'))
  c = api('post', '/v1/certificates', data: {
            type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: csr.to_pem }
          })['data']
  puts 'distribution certificate: created for FoodFox'
  [c['id'], OpenSSL::X509::Certificate.new(Base64.decode64(c.dig('attributes', 'certificateContent')))]
end

def profile(bundle, cert_id, dirs)
  api('get', "/v1/profiles?#{query('filter[name]' => PROFILE_NAME, 'limit' => 20)}")['data'].each do |old|
    api('delete', "/v1/profiles/#{old['id']}") if old.dig('attributes', 'name') == PROFILE_NAME
  end
  created = api('post', '/v1/profiles', data: {
                  type: 'profiles',
                  attributes: { name: PROFILE_NAME, profileType: 'IOS_APP_STORE' },
                  relationships: {
                    bundleId: { data: { type: 'bundleIds', id: bundle } },
                    certificates: { data: [{ type: 'certificates', id: cert_id }] }
                  }
                })['data']['attributes']
  content = Base64.decode64(created['profileContent'])
  dirs.each do |d|
    FileUtils.mkdir_p(d)
    File.binwrite(File.join(d, "#{created['uuid']}.mobileprovision"), content)
  end
  puts "profile #{PROFILE_NAME}: #{created['uuid']}"
end

# Older Xcode reads the first folder, Xcode 16 and later the second.
profile_dirs = ["#{Dir.home}/Library/MobileDevice/Provisioning Profiles",
                "#{Dir.home}/Library/Developer/Xcode/UserData/Provisioning Profiles"]

bundle = bundle_id
key = distribution_key
cert_id, cert = certificate(key)
profile(bundle, cert_id, profile_dirs)
# Apple puts the team id into the certificate subject as OU.
team = cert.subject.to_a.find { |name, _, _| name == 'OU' }&.at(1)
puts "team id: #{team || 'not found in the certificate'}"

app = api('get', "/v1/apps?#{query('filter[bundleId]' => BUNDLE_ID)}")['data'].first
puts "App Store Connect app record: #{app ? "#{app.dig('attributes', 'name')} (#{app['id']})" : 'MISSING'}"

# Separate key and certificate: macOS `security` does not always read OpenSSL 3 .p12 files.
File.write(File.join(out, 'distribution.key'), key.to_pem)
File.binwrite(File.join(out, 'distribution.cer'), cert.to_der)
File.write(File.join(out, 'signing.env'), [
  "FOX_APP_PROFILE=#{PROFILE_NAME}",
  "FOX_TEAM_ID=#{team}",
  "ASC_APP_ID=#{app && app['id']}"
].join("\n") + "\n")
