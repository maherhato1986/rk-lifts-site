<?php
header("Content-Type: application/json; charset=UTF-8");

// حماية بسيطة
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

// قراءة البيانات
$data = json_decode(file_get_contents("php://input"), true);

// تنظيف القيم
function clean($v) {
    return htmlspecialchars(trim($v ?? "—"));
}

$name           = clean($data['name'] ?? '');
$phone          = clean($data['phone'] ?? '');
$type           = clean($data['type'] ?? '');
$hasContract    = clean($data['hasContract'] ?? '');
$projectName    = clean($data['projectName'] ?? '');
$elevatorStatus = clean($data['elevatorStatus'] ?? '');
$priority       = clean($data['priority'] ?? '');
$description    = clean($data['description'] ?? '');
$location       = clean($data['location'] ?? '');
$imageStatus    = clean($data['imageStatus'] ?? '');

// تحقق أساسي
if ($name === '—' || $phone === '—' || $type === '—') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "بيانات ناقصة"]);
    exit;
}

// إعداد الإيميل
$to      = "admin@rkl.sa";
$subject = "📩 طلب خدمة جديد – RKL";

$message = "
طلب خدمة جديد من الموقع:

👤 الاسم: $name
📞 الجوال: $phone
🛠 نوع الطلب: $type
📄 عقد صيانة: $hasContract

🏢 اسم المشروع: $projectName
🚨 حالة المصعد: $elevatorStatus
⚡ أولوية الطلب: $priority

📝 وصف العطل:
$description

📍 موقع المصعد:
$location

📎 صورة مرفقة:
$imageStatus
";

$headers  = "From: RKL Website <no-reply@rkl.sa>\r\n";
$headers .= "Reply-To: $phone\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8";

// إرسال الإيميل
if (mail($to, $subject, $message, $headers)) {
    echo json_encode(["status" => "success"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Mail failed"]);
}
