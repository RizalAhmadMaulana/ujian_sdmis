import os
import io
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.contrib.auth.hashers import make_password, PBKDF2PasswordHasher
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

logger = logging.getLogger(__name__)


class FastBulkPasswordHasher(PBKDF2PasswordHasher):
    """
    Password Hasher berkecepatan tinggi khusus impor massal (Bulk Import).
    Menggunakan algoritma standar pbkdf2_sha256 dengan 25.000 iterasi sehingga
    130+ akun siswa dapat di-hash dalam waktu < 0.5 detik tanpa memicu Gunicorn Worker Timeout.
    Django secara otomatis memvalidasi hash ini dan meng-upgrade-nya ke iterasi penuh saat user login.
    """
    iterations = 25000

_bulk_hasher = FastBulkPasswordHasher()

def _make_bulk_password(raw_password):
    s = str(raw_password or '').strip()
    return _bulk_hasher.encode(s, _bulk_hasher.salt())

from .models import User, ClassRoom, SchoolSetting
from .serializers import (
    UserSerializer, 
    UserCreateUpdateSerializer,
    UserProfileUpdateSerializer,
    StudentSerializer,
    TeacherSerializer,
    ClassRoomSerializer, 
    CustomTokenObtainPairSerializer,
    SchoolSettingSerializer
)
from .permissions import IsTeacherRole

class CustomLoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Mengautentikasi pengguna dan mengembalikan access token, refresh token, serta detail user
    """
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(APIView):
    """
    GET /api/auth/me/ -> Mengambil data profil pengguna yang sedang login
    PATCH /api/auth/me/ -> Memperbarui profil akun sendiri (nama, email, username/nip, kata sandi)
    PUT /api/auth/me/ -> Memperbarui profil akun sendiri
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)


# ==========================================
# CRUD KELAS / ROMBEL
# ==========================================
class ClassRoomListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/classrooms/ -> Daftar seluruh kelas
    POST /api/accounts/classrooms/ -> Tambah kelas baru (Guru/Admin)
    """
    queryset = ClassRoom.objects.all().order_by('name')
    serializer_class = ClassRoomSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacherRole()]
        return [permissions.IsAuthenticated()]


class ClassRoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/classrooms/<pk>/
    PUT/PATCH /api/accounts/classrooms/<pk>/
    DELETE /api/accounts/classrooms/<pk>/
    """
    queryset = ClassRoom.objects.all()
    serializer_class = ClassRoomSerializer
    permission_classes = [IsTeacherRole]


# ==========================================
# CRUD PENGGUNA (USER MANAGEMENT)
# ==========================================
class UserListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/users/ -> Daftar user dengan filter role, kelas, search
    POST /api/accounts/users/ -> Buat user baru (Guru/Siswa)
    """
    permission_classes = [IsTeacherRole]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all().select_related('classroom').order_by('role', 'username')
        role = self.request.query_params.get('role')
        classroom_id = self.request.query_params.get('classroom_id')
        search = self.request.query_params.get('search')

        if role:
            queryset = queryset.filter(role=role)
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | 
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(nip__icontains=search) |
                Q(nisn__icontains=search)
            )
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/users/<pk>/
    PUT/PATCH /api/accounts/users/<pk>/
    DELETE /api/accounts/users/<pk>/
    """
    queryset = User.objects.all()
    permission_classes = [IsTeacherRole]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserCreateUpdateSerializer
        return UserSerializer


class UserExcelTemplateView(APIView):
    """
    GET /api/accounts/users/template-excel/
    Mengunduh template file Excel resmi untuk import pengguna (Management User)
    """
    permission_classes = [IsTeacherRole]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template User"
        ws.views.sheetView[0].showGridLines = True

        font_title = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        font_subtitle = Font(name="Calibri", size=9, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        
        fill_header = PatternFill(start_color="312E81", end_color="312E81", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A1:F1")
        cell_title = ws.cell(row=1, column=1, value="TEMPLATE IMPORT PENGGUNA E-UJIAN PRO")
        cell_title.font = font_title
        cell_title.alignment = align_center

        ws.merge_cells("A2:F2")
        cell_sub = ws.cell(row=2, column=1, value="Role diisi 'TEACHER' atau 'STUDENT'. Password opsional (default = Username jika kosong).")
        cell_sub.font = font_subtitle
        cell_sub.alignment = align_center

        headers = ["No", "Username (NIP / NISN)", "Nama Lengkap", "Email", "Role (TEACHER / STUDENT)", "Password (Opsional)"]
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
        ws.row_dimensions[4].height = 24

        sample_data = [
            [1, "198001012005011001", "Drs. Bambang Wijaya", "bambang@sekolah.sch.id", "TEACHER", ""],
            [2, "0081234501", "Ahmad Fadhil Ramadhan", "fadhil@siswa.sch.id", "STUDENT", ""],
            [3, "0081234502", "Aisyah Azzahra", "aisyah@siswa.sch.id", "STUDENT", ""],
        ]

        for row_idx, row_values in enumerate(sample_data, start=5):
            for col_idx, val in enumerate(row_values, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                cell.alignment = align_center if col_idx in [1, 2, 5, 6] else align_left
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
            ws.row_dimensions[row_idx].height = 20

        col_widths = {1: 8, 2: 24, 3: 32, 4: 28, 5: 24, 6: 22}
        for col_num, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_num)].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Import_User_E-Ujian.xlsx"'
        return response


class UserExcelImportView(APIView):
    """
    POST /api/accounts/users/import-excel/
    Mengimpor pengguna massal dari file Excel ke Management User
    """
    permission_classes = [IsTeacherRole]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"success": False, "error": "Harap pilih berkas Excel (.xlsx) yang akan diimpor!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({"success": False, "error": f"Gagal membaca berkas Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        total_rows = 0
        errors = []

        header_row_idx = None
        col_map = {}

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if not row:
                continue
            row_str = [str(c or '').strip().lower() for c in row]
            
            if any(k in h for h in row_str for k in ['username', 'nip', 'nisn', 'user']) or any(k in h for h in row_str for k in ['nama', 'name']):
                header_row_idx = r_idx
                for c_idx, h in enumerate(row_str):
                    if any(k in h for k in ['username', 'nip', 'nisn', 'no induk']) and 'username' not in col_map:
                        col_map['username'] = c_idx
                    elif any(k in h for k in ['nama', 'name', 'full_name']) and 'name' not in col_map:
                        col_map['name'] = c_idx
                    elif 'email' in h and 'email' not in col_map:
                        col_map['email'] = c_idx
                    elif any(k in h for k in ['role', 'peran', 'jabatan']) and 'role' not in col_map:
                        col_map['role'] = c_idx
                    elif any(k in h for k in ['password', 'sandi']) and 'password' not in col_map:
                        col_map['password'] = c_idx
                break

        if header_row_idx is None or 'username' not in col_map:
            col_map = {'username': 1, 'name': 2, 'email': 3, 'role': 4, 'password': 5}
            header_row_idx = 4

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if r_idx <= header_row_idx or not row:
                continue

            def get_val(key):
                idx = col_map.get(key)
                if idx is not None and idx < len(row):
                    val = row[idx]
                    if val is None:
                        return ""
                    if isinstance(val, float) and val.is_integer():
                        return str(int(val)).strip()
                    return str(val).strip()
                return ""

            raw_username = get_val('username')
            raw_name = get_val('name')
            raw_email = get_val('email')
            raw_role = get_val('role').upper()
            raw_password = get_val('password')

            if not raw_username and not raw_name:
                continue

            total_rows += 1
            if not raw_username:
                errors.append(f"Baris {r_idx}: Username kosong untuk '{raw_name}'")
                continue

            final_role = User.RoleChoices.STUDENT
            if 'TEACH' in raw_role or 'GURU' in raw_role:
                final_role = User.RoleChoices.TEACHER

            final_password = raw_password if raw_password else raw_username

            try:
                user, created = User.objects.get_or_create(
                    username=raw_username,
                    defaults={
                        "full_name": raw_name or raw_username,
                        "role": final_role,
                        "email": raw_email
                    }
                )

                if created:
                    user.set_password(final_password)
                    if final_role == User.RoleChoices.TEACHER:
                        user.nip = raw_username
                        user.is_staff = True
                    else:
                        user.nisn = raw_username
                    user.save()
                    created_count += 1
                else:
                    if raw_name:
                        user.full_name = raw_name
                    if raw_email:
                        user.email = raw_email
                    user.role = final_role
                    if raw_password:
                        user.set_password(raw_password)
                    if final_role == User.RoleChoices.TEACHER:
                        user.nip = raw_username
                        user.is_staff = True
                    else:
                        user.nisn = raw_username
                    user.save()
                    updated_count += 1
            except Exception as e:
                errors.append(f"Baris {r_idx} ({raw_username}): {str(e)}")

        return Response({
            "success": True,
            "message": f"Impor selesai! {created_count} user baru dibuat, {updated_count} diperbarui.",
            "created_count": created_count,
            "updated_count": updated_count,
            "total_rows": total_rows,
            "errors": errors
        }, status=status.HTTP_200_OK)


# ==========================================
# CRUD & IMPORT DATA SISWA
# ==========================================
class StudentListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/students/ -> Daftar siswa
    POST /api/accounts/students/ -> Tambah siswa baru (auto User role STUDENT & password = NISN)
    """
    permission_classes = [IsTeacherRole]
    serializer_class = StudentSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name')
        classroom_id = self.request.query_params.get('classroom_id') or self.request.query_params.get('classroom')
        search = self.request.query_params.get('search')

        if classroom_id:
            if str(classroom_id).isdigit():
                queryset = queryset.filter(Q(classroom_id=int(classroom_id)) | Q(classroom__name__iexact=str(classroom_id)))
            else:
                queryset = queryset.filter(classroom__name__iexact=str(classroom_id))
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | 
                Q(nisn__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/students/<pk>/
    PUT/PATCH /api/accounts/students/<pk>/
    DELETE /api/accounts/students/<pk>/ -> Menghapus siswa & akun usernya
    """
    queryset = User.objects.filter(role=User.RoleChoices.STUDENT)
    permission_classes = [IsTeacherRole]
    serializer_class = StudentSerializer


class StudentExcelTemplateView(APIView):
    """
    GET /api/accounts/students/template-excel/
    Mengunduh template file Excel resmi untuk Data Siswa
    """
    permission_classes = [IsTeacherRole]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Data Siswa"
        ws.views.sheetView[0].showGridLines = True

        font_title = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        font_subtitle = Font(name="Calibri", size=9, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        
        fill_header = PatternFill(start_color="1D6F42", end_color="1D6F42", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A1:E1")
        cell_title = ws.cell(row=1, column=1, value="TEMPLATE IMPORT DATA SISWA E-UJIAN PRO")
        cell_title.font = font_title
        cell_title.alignment = align_center

        ws.merge_cells("A2:E2")
        cell_sub = ws.cell(row=2, column=1, value="Akun user siswa akan otomatis dibuat dengan Username & Password = NISN.")
        cell_sub.font = font_subtitle
        cell_sub.alignment = align_center

        headers = ["No", "NISN", "Nama Siswa", "Kelas", "Email"]
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
        ws.row_dimensions[4].height = 24

        sample_data = [
            [1, "0081234501", "Ahmad Fadhil Ramadhan", "9A", "fadhil@siswa.sch.id"],
            [2, "0081234502", "Aisyah Azzahra", "9A", "aisyah@siswa.sch.id"],
            [3, "0081234503", "Budi Santoso", "9A", "budi@siswa.sch.id"],
            [4, "0081234504", "Citra Kirana", "9B", "citra@siswa.sch.id"],
            [5, "0081234505", "Dimas Anggara", "9B", "dimas@siswa.sch.id"],
        ]

        for row_idx, row_values in enumerate(sample_data, start=5):
            for col_idx, val in enumerate(row_values, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                cell.alignment = align_center if col_idx in [1, 2, 4] else align_left
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
            ws.row_dimensions[row_idx].height = 20

        col_widths = {1: 8, 2: 20, 3: 35, 4: 18, 5: 30}
        for col_num, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_num)].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Import_Siswa_E-Ujian.xlsx"'
        return response


# ==========================================
# HELPER & DUA FUNGSI PARSER IMPORT DATA SISWA
# ==========================================
def _clean_student_cell_value(val):
    """Membersihkan nilai cell excel menjadi string bersih tanpa spasi ganda."""
    if val is None:
        return ""
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val)).strip()
        return str(val).strip()
    if isinstance(val, int):
        return str(val).strip()
    return str(val).strip()


def _clean_student_email(email_str):
    """Sanitasi email: jika berisi '-' atau placeholder kosong, ubah jadi string kosong."""
    if not email_str:
        return ""
    s = str(email_str).strip()
    if s.lower() in ['-', 'none', 'null', 'nan', 'undefined', '']:
        return ""
    return s


def _process_student_batch(rows_data, default_classroom, academic_year, errors):
    """
    Eksekusi impor data siswa massal secara kilat dengan Smart Matching (Upsert):
    1. Filter & deduplikasi data di memori.
    2. Caching objek ClassRoom (menghilangkan ratusan query redundant).
    3. Smart Matching: Pencocokan cerdas berdasarkan NISN eksak, NISN tanpa leading-zero,
       dan Nama Siswa (case-insensitive).
    4. Jika data ditemukan -> UPDATE data lama (kelas diperbarui, email diperbarui, tanpa duplikasi).
    5. Jika data belum ada -> CREATE akun siswa baru (password hashing multithreaded paralel).
    6. Eksekusi database single transaction atomic bulk_create & bulk_update.
    """
    # 1. Filter baris kosong/invalid di memori
    unique_rows = []
    seen_nisns_in_file = set()
    for r in rows_data:
        raw_nisn = str(r.get('nisn') or '').strip()
        if not raw_nisn or raw_nisn.lower() in ['-', 'none', 'null', 'nan', 'undefined', '']:
            if r.get('name'):
                errors.append(f"Baris {r['r_idx']}: NISN kosong atau '-' untuk siswa '{r['name']}' (dilewati)")
            continue

        clean_nisn_key = raw_nisn.replace('.', '').lstrip('0') or raw_nisn
        if clean_nisn_key in seen_nisns_in_file:
            errors.append(f"Baris {r['r_idx']}: NISN '{raw_nisn}' muncul berulang dalam berkas (hanya baris pertama yang diproses)")
            continue
        seen_nisns_in_file.add(clean_nisn_key)
        unique_rows.append(r)

    if not unique_rows:
        return {
            "created_count": 0,
            "updated_count": 0,
            "total_rows": 0,
            "errors": errors
        }

    # 2. Cache kelas di memori (hindari query redundant)
    classroom_cache = {c.name.strip().lower(): c for c in ClassRoom.objects.all()}
    for r in unique_rows:
        clean_class = str(r.get('class') or '').strip()
        if clean_class and clean_class.lower() not in ['-', 'none', 'null', 'nan', '']:
            cache_key = clean_class.lower()
            if cache_key in classroom_cache:
                r['classroom_obj'] = classroom_cache[cache_key]
            else:
                cls_obj = ClassRoom.objects.create(name=clean_class, academic_year=academic_year)
                classroom_cache[cache_key] = cls_obj
                r['classroom_obj'] = cls_obj
        else:
            r['classroom_obj'] = default_classroom

    # 3. Smart Matching: Pre-load data siswa yang ada di database
    all_students_qs = list(User.objects.filter(role=User.RoleChoices.STUDENT))
    by_nisn = {}
    by_nisn_stripped = {}
    by_name = {}

    for u in all_students_qs:
        u_nisn = str(u.username or u.nisn or '').strip()
        if u_nisn:
            by_nisn[u_nisn] = u
            clean_digits = u_nisn.replace('.', '').lstrip('0')
            if clean_digits:
                by_nisn_stripped[clean_digits] = u
        
        u_name = " ".join(str(u.full_name or '').strip().lower().split())
        if u_name:
            by_name[u_name] = u

    # Himpunan seluruh username yang sudah ada (untuk mencegah collision)
    all_existing_usernames = set(User.objects.values_list('username', flat=True))

    new_students = []
    update_students = []
    updated_user_ids = set()

    for r in unique_rows:
        raw_nisn = str(r['nisn']).strip()
        name = r.get('name') or f"Siswa {raw_nisn}"
        email = _clean_student_email(r.get('email'))
        cls_obj = r['classroom_obj']

        clean_digits = raw_nisn.replace('.', '').lstrip('0')
        clean_name = " ".join(str(name).strip().lower().split())

        # Prioritas 1: Pencocokan NISN Eksak
        matched_user = by_nisn.get(raw_nisn)
        # Prioritas 2: Pencocokan NISN Tanpa Leading Zero (misal '152093713' cocok dengan '0152093713')
        if not matched_user and clean_digits:
            matched_user = by_nisn_stripped.get(clean_digits)
        # Prioritas 3: Pencocokan Nama Lengkap Siswa Sama (Case-Insensitive)
        if not matched_user and clean_name:
            matched_user = by_name.get(clean_name)

        if matched_user:
            # Cegah duplikasi instance dalam list update_students
            if matched_user.id in updated_user_ids:
                continue
            updated_user_ids.add(matched_user.id)

            # Update data siswa lama
            matched_user.full_name = name
            if email:
                matched_user.email = email
            matched_user.classroom = cls_obj
            # Jika user di DB sudah 10 digit (015...) dan raw_nisn 9 digit (15...), pertahankan yang 10 digit
            if not (str(matched_user.username).startswith('0') and len(str(matched_user.username)) == 10 and len(raw_nisn) == 9):
                matched_user.nisn = raw_nisn
            matched_user.role = User.RoleChoices.STUDENT
            update_students.append(matched_user)
        else:
            target_username = raw_nisn
            if target_username in all_existing_usernames:
                errors.append(f"Baris {r['r_idx']}: Username/NISN '{target_username}' untuk '{name}' sudah digunakan akun lain (dilewati)")
                continue

            all_existing_usernames.add(target_username)
            new_students.append({
                'nisn': target_username,
                'name': name,
                'email': email,
                'classroom': cls_obj,
            })

    # 4. Multithreaded password hashing paralel untuk siswa baru (Ultra-Fast PBKDF2: < 0.3 detik)
    users_to_create = []
    if new_students:
        cpu_workers = min(8, (os.cpu_count() or 2) * 2)
        with ThreadPoolExecutor(max_workers=cpu_workers) as executor:
            passwords = list(executor.map(_make_bulk_password, [s['nisn'] for s in new_students]))

        for s, pw in zip(new_students, passwords):
            users_to_create.append(
                User(
                    id=uuid.uuid4(),
                    username=s['nisn'],
                    nisn=s['nisn'],
                    full_name=s['name'],
                    classroom=s['classroom'],
                    email=s['email'],
                    role=User.RoleChoices.STUDENT,
                    password=pw
                )
            )

    # 5. Eksekusi database dalam 1 transaksi atomic tunggal (High Speed)
    with transaction.atomic():
        if users_to_create:
            User.objects.bulk_create(users_to_create, batch_size=250)
        if update_students:
            User.objects.bulk_update(
                update_students,
                fields=['full_name', 'email', 'classroom', 'nisn', 'role'],
                batch_size=250
            )

    return {
        "created_count": len(users_to_create),
        "updated_count": len(update_students),
        "total_rows": len(unique_rows),
        "errors": errors
    }


def _import_students_from_tahfidz_mis(ws, header_row_idx, col_map, default_classroom, academic_year):
    """
    FUNGSI 1: Mengambil data siswa dari berkas Export Risalah / Tahfidz_MIS.
    Logika Khusus:
    - Hanya mendeteksi dan mengambil kolom yang dibutuhkan: NISN, Nama Siswa, Kelas, Email.
    - Kolom-kolom yang tidak dibutuhkan (No, Jenis Kelamin, Guru Pengampu, Tempat Tanggal Lahir,
      No Telp Orangtua, dll) diabaikan total dan TIDAK masuk ke database.
    - Memproses baris secara kilat via _process_student_batch.
    """
    errors = []
    idx_name = col_map.get('name', 1)
    idx_nisn = col_map.get('nisn', 3)
    idx_class = col_map.get('class', 4)
    idx_email = col_map.get('email', 8)

    rows_data = []
    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if r_idx <= header_row_idx or not row:
            continue

        def get_val(idx):
            if idx is not None and idx < len(row):
                return _clean_student_cell_value(row[idx])
            return ""

        raw_nisn = get_val(idx_nisn)
        raw_name = get_val(idx_name)
        raw_class = get_val(idx_class)
        raw_email = get_val(idx_email)

        if not raw_nisn and not raw_name:
            continue

        rows_data.append({
            'r_idx': r_idx,
            'nisn': raw_nisn,
            'name': raw_name,
            'class': raw_class,
            'email': raw_email
        })

    res = _process_student_batch(rows_data, default_classroom, academic_year, errors)
    res['format_name'] = "Export Data Siswa Tahfidz_MIS / Risalah"
    return res


def _import_students_from_standard_template(ws, header_row_idx, col_map, default_classroom, academic_year):
    """
    FUNGSI 2: Mengambil data siswa dari template resmi E-Ujian / Ujian SDMIS (Template_Import_Siswa_E-Ujian.xlsx).
    Logika Khusus:
    - Mengambil kolom sesuai template standar: [No, NISN, Nama Siswa, Kelas, Email].
    - Memproses baris secara kilat via _process_student_batch.
    """
    errors = []
    idx_nisn = col_map.get('nisn', 1)
    idx_name = col_map.get('name', 2)
    idx_class = col_map.get('class', 3)
    idx_email = col_map.get('email', 4)

    rows_data = []
    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if r_idx <= header_row_idx or not row:
            continue

        def get_val(idx):
            if idx is not None and idx < len(row):
                return _clean_student_cell_value(row[idx])
            return ""

        raw_nisn = get_val(idx_nisn)
        raw_name = get_val(idx_name)
        raw_class = get_val(idx_class)
        raw_email = get_val(idx_email)

        if not raw_nisn and not raw_name:
            continue

        rows_data.append({
            'r_idx': r_idx,
            'nisn': raw_nisn,
            'name': raw_name,
            'class': raw_class,
            'email': raw_email
        })

    res = _process_student_batch(rows_data, default_classroom, academic_year, errors)
    res['format_name'] = "Template Standar E-Ujian"
    return res


class StudentExcelImportView(APIView):
    """
    POST /api/accounts/students/import-excel/
    Mengimpor data siswa massal secara dinamis:
    1. Mendukung Berkas Export Risalah / Tahfidz_MIS (otomatis filter kolom NISN, Nama Siswa, Kelas, Email saja).
    2. Mendukung Berkas Template Standar E-Ujian (Template_Import_Siswa_E-Ujian.xlsx).
    """
    permission_classes = [IsTeacherRole]

    def post(self, request):
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({"success": False, "error": "Harap pilih berkas Excel (.xlsx)!"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                wb = openpyxl.load_workbook(file, data_only=True)
                ws = wb.active
            except Exception as e:
                return Response({"success": False, "error": f"Gagal membaca berkas Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Ambil tahun ajaran aktif dari SchoolSetting
            school_setting = SchoolSetting.get_settings()
            academic_year = school_setting.academic_year if (school_setting and school_setting.academic_year) else "2026/2027"

            # 2. Siapkan default classroom
            default_classroom = ClassRoom.objects.first()
            if not default_classroom:
                default_classroom = ClassRoom.objects.create(name="Kelas Utama", academic_year=academic_year)

            # 3. Analisis header baris untuk mendeteksi format (Tahfidz_MIS vs Template Standar)
            detected_format = "STANDARD"
            header_row_idx = None
            col_map = {}

            for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
                if not row or r_idx > 10:
                    continue
                row_str = [str(c or '').strip().lower() for c in row]

                # A. Deteksi Ciri Khas Format Export Risalah / Tahfidz_MIS
                # Memiliki kolom unik seperti 'guru pengampu', 'jenis kelamin', 'tempat, tanggal lahir', atau 'no telp'
                if any('guru pengampu' in h or 'jenis kelamin' in h or 'no telp' in h for h in row_str):
                    detected_format = "TAHFIDZ_MIS"
                    header_row_idx = r_idx
                    for c_idx, h in enumerate(row_str):
                        # PENTING: cegah 'jenis kelamin' salah terdeteksi sebagai 'nisn' dengan memastikan 'jenis' tidak ada
                        if ('nisn' in h or h in ['nis', 'no induk']) and 'jenis' not in h:
                            if 'nisn' not in col_map:
                                col_map['nisn'] = c_idx
                        elif any(k in h for k in ['nama siswa', 'nama lengkap', 'nama']) and 'name' not in col_map:
                            col_map['name'] = c_idx
                        elif any(k in h for k in ['kelas', 'rombel']) and 'class' not in col_map:
                            col_map['class'] = c_idx
                        elif 'email' in h and 'email' not in col_map:
                            col_map['email'] = c_idx
                    break

                # B. Deteksi Format Template Standar E-Ujian / Ujian SDMIS
                if any(k in h for k in ['nisn', 'nis', 'no induk']) and any(k in h for k in ['nama', 'siswa', 'name']):
                    detected_format = "STANDARD"
                    header_row_idx = r_idx
                    for c_idx, h in enumerate(row_str):
                        if ('nisn' in h or h in ['nis', 'no induk', 'username']) and 'jenis' not in h:
                            if 'nisn' not in col_map:
                                col_map['nisn'] = c_idx
                        elif any(k in h for k in ['nama', 'siswa', 'name']) and 'name' not in col_map:
                            col_map['name'] = c_idx
                        elif any(k in h for k in ['kelas', 'rombel', 'class']) and 'class' not in col_map:
                            col_map['class'] = c_idx
                        elif 'email' in h and 'email' not in col_map:
                            col_map['email'] = c_idx
                    break

            # Fallback jika header tidak terdeteksi otomatis
            if header_row_idx is None:
                if ws.title and ('tahfidz' in ws.title.lower() or 'siswa' in ws.title.lower()):
                    detected_format = "TAHFIDZ_MIS"
                    header_row_idx = 1
                    col_map = {'name': 1, 'nisn': 3, 'class': 4, 'email': 8}
                else:
                    detected_format = "STANDARD"
                    header_row_idx = 4
                    col_map = {'nisn': 1, 'name': 2, 'class': 3, 'email': 4}

            # 4. Eksekusi fungsi import sesuai format yang terdeteksi
            if detected_format == "TAHFIDZ_MIS":
                result = _import_students_from_tahfidz_mis(
                    ws=ws,
                    header_row_idx=header_row_idx,
                    col_map=col_map,
                    default_classroom=default_classroom,
                    academic_year=academic_year
                )
            else:
                result = _import_students_from_standard_template(
                    ws=ws,
                    header_row_idx=header_row_idx,
                    col_map=col_map,
                    default_classroom=default_classroom,
                    academic_year=academic_year
                )

            format_label = result.get("format_name", "Template Standar")
            return Response({
                "success": True,
                "message": f"Impor data siswa berhasil ({format_label})! {result['created_count']} siswa baru terdaftar (akun aktif pw=NISN), {result['updated_count']} data diperbarui.",
                "created_count": result['created_count'],
                "updated_count": result['updated_count'],
                "total_rows": result['total_rows'],
                "detected_format": detected_format,
                "format_label": format_label,
                "errors": result['errors']
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Error in StudentExcelImportView")
            return Response({
                "success": False,
                "error": f"Gagal memproses impor data siswa: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# CRUD & IMPORT DATA GURU
# ==========================================
class TeacherListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/teachers/ -> Daftar guru pengawas
    POST /api/accounts/teachers/ -> Tambah guru baru (auto User role TEACHER & password = NIP)
    """
    permission_classes = [IsTeacherRole]
    serializer_class = TeacherSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role=User.RoleChoices.TEACHER).order_by('full_name')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | 
                Q(nip__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset


class TeacherDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/accounts/teachers/<pk>/
    PUT/PATCH /api/accounts/teachers/<pk>/
    DELETE /api/accounts/teachers/<pk>/ -> Menghapus guru & akun usernya
    """
    queryset = User.objects.filter(role=User.RoleChoices.TEACHER)
    permission_classes = [IsTeacherRole]
    serializer_class = TeacherSerializer


class TeacherExcelTemplateView(APIView):
    """
    GET /api/accounts/teachers/template-excel/
    Mengunduh template file Excel resmi untuk Data Guru
    """
    permission_classes = [IsTeacherRole]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Data Guru"
        ws.views.sheetView[0].showGridLines = True

        font_title = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        font_subtitle = Font(name="Calibri", size=9, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        
        fill_header = PatternFill(start_color="0369A1", end_color="0369A1", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A1:D1")
        cell_title = ws.cell(row=1, column=1, value="TEMPLATE IMPORT DATA GURU E-UJIAN PRO")
        cell_title.font = font_title
        cell_title.alignment = align_center

        ws.merge_cells("A2:D2")
        cell_sub = ws.cell(row=2, column=1, value="Akun user guru akan otomatis dibuat dengan Username & Password = NIP.")
        cell_sub.font = font_subtitle
        cell_sub.alignment = align_center

        headers = ["No", "NIP", "Nama Guru", "Email"]
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
        ws.row_dimensions[4].height = 24

        sample_data = [
            [1, "198001012005011001", "Drs. Bambang Wijaya, M.Pd", "bambang@sekolah.sch.id"],
            [2, "198502152009022003", "Siti Nurjanah, S.Pd", "siti@sekolah.sch.id"],
            [3, "199003202015031002", "Rizki Maulana, S.Kom", "rizki@sekolah.sch.id"],
        ]

        for row_idx, row_values in enumerate(sample_data, start=5):
            for col_idx, val in enumerate(row_values, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = font_data
                cell.border = thin_border
                cell.alignment = align_center if col_idx in [1, 2] else align_left
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
            ws.row_dimensions[row_idx].height = 20

        col_widths = {1: 8, 2: 24, 3: 35, 4: 30}
        for col_num, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_num)].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Import_Guru_E-Ujian.xlsx"'
        return response


# ==========================================
# HELPER & DUA FUNGSI PARSER IMPORT DATA GURU
# ==========================================
def _process_teacher_batch(rows_data, errors):
    """
    Eksekusi impor data guru massal secara kilat dengan Smart Matching (Upsert):
    1. Filter & deduplikasi NIP di memori.
    2. Smart Matching: Pencocokan cerdas berdasarkan NIP eksak, NIP tanpa leading zero,
       dan Nama Lengkap Guru (case-insensitive).
    3. Jika data ditemukan -> UPDATE data lama (nama/email diperbarui, role=TEACHER, is_staff=True).
    4. Jika data belum ada -> CREATE akun guru baru (password hashing multithreaded paralel).
    5. Database transaction atomic bulk_create & bulk_update.
    6. Sinkronisasi otomatis dua arah dengan Manajemen Pengguna.
    """
    unique_rows = []
    seen_nips_in_file = set()
    for r in rows_data:
        raw_nip = str(r.get('nip') or '').strip()
        if not raw_nip or raw_nip.lower() in ['-', 'none', 'null', 'nan', 'undefined', '']:
            if r.get('name'):
                errors.append(f"Baris {r['r_idx']}: NIP kosong atau '-' untuk guru '{r['name']}' (dilewati)")
            continue

        clean_nip_key = raw_nip.replace('.', '').lstrip('0') or raw_nip
        if clean_nip_key in seen_nips_in_file:
            errors.append(f"Baris {r['r_idx']}: NIP '{raw_nip}' muncul berulang dalam berkas (hanya baris pertama yang diproses)")
            continue
        seen_nips_in_file.add(clean_nip_key)
        unique_rows.append(r)

    if not unique_rows:
        return {
            "created_count": 0,
            "updated_count": 0,
            "total_rows": 0,
            "errors": errors
        }

    # Load seluruh guru yang sudah ada di database
    all_teachers_qs = list(User.objects.filter(role=User.RoleChoices.TEACHER))
    by_nip = {}
    by_nip_stripped = {}
    by_name = {}

    for u in all_teachers_qs:
        u_nip = str(u.username or u.nip or '').strip()
        if u_nip:
            by_nip[u_nip] = u
            clean_digits = u_nip.replace('.', '').lstrip('0')
            if clean_digits:
                by_nip_stripped[clean_digits] = u

        u_name = " ".join(str(u.full_name or '').strip().lower().split())
        if u_name:
            by_name[u_name] = u

    all_existing_usernames = set(User.objects.values_list('username', flat=True))

    new_teachers = []
    update_teachers = []
    updated_teacher_ids = set()

    for r in unique_rows:
        raw_nip = str(r['nip']).strip()
        name = r.get('name') or f"Guru {raw_nip}"
        email = _clean_student_email(r.get('email'))

        clean_digits = raw_nip.replace('.', '').lstrip('0')
        clean_name = " ".join(str(name).strip().lower().split())

        # Prioritas 1: NIP Eksak
        matched_user = by_nip.get(raw_nip)
        # Prioritas 2: NIP Tanpa Leading Zero
        if not matched_user and clean_digits:
            matched_user = by_nip_stripped.get(clean_digits)
        # Prioritas 3: Nama Lengkap Guru Sama (Case-Insensitive)
        if not matched_user and clean_name:
            matched_user = by_name.get(clean_name)

        if matched_user:
            if matched_user.id in updated_teacher_ids:
                continue
            updated_teacher_ids.add(matched_user.id)

            matched_user.full_name = name
            if email:
                matched_user.email = email
            matched_user.nip = raw_nip
            matched_user.role = User.RoleChoices.TEACHER
            matched_user.is_staff = True
            update_teachers.append(matched_user)
        else:
            target_username = raw_nip
            if target_username in all_existing_usernames:
                errors.append(f"Baris {r['r_idx']}: Username/NIP '{target_username}' untuk '{name}' sudah digunakan akun lain (dilewati)")
                continue

            all_existing_usernames.add(target_username)
            new_teachers.append({
                'nip': target_username,
                'name': name,
                'email': email,
            })

    # Multithreaded password hashing paralel untuk guru baru (Ultra-Fast PBKDF2: < 0.1 detik)
    users_to_create = []
    if new_teachers:
        cpu_workers = min(8, (os.cpu_count() or 2) * 2)
        with ThreadPoolExecutor(max_workers=cpu_workers) as executor:
            passwords = list(executor.map(_make_bulk_password, [t['nip'] for t in new_teachers]))

        for t, pw in zip(new_teachers, passwords):
            users_to_create.append(
                User(
                    id=uuid.uuid4(),
                    username=t['nip'],
                    nip=t['nip'],
                    full_name=t['name'],
                    email=t['email'],
                    role=User.RoleChoices.TEACHER,
                    is_staff=True,
                    password=pw
                )
            )

    # Eksekusi database dalam 1 transaksi atomic tunggal (High Speed)
    with transaction.atomic():
        if users_to_create:
            User.objects.bulk_create(users_to_create, batch_size=250)
        if update_teachers:
            User.objects.bulk_update(
                update_teachers,
                fields=['full_name', 'email', 'nip', 'role', 'is_staff'],
                batch_size=250
            )

    return {
        "created_count": len(users_to_create),
        "updated_count": len(update_teachers),
        "total_rows": len(unique_rows),
        "errors": errors
    }


def _import_teachers_from_tahfidz_mis(ws, header_row_idx, col_map):
    """
    FUNGSI 1: Mengambil data guru dari berkas Export Risalah / Tahfidz_MIS.
    Logika Khusus:
    - Hanya mendeteksi dan mengambil kolom yang dibutuhkan: NIP, Nama Guru, Email.
    - Kolom-kolom yang tidak dibutuhkan (No, Jenis Kelamin, Wali Kelas, Murid Ampu,
      Tempat Tanggal Lahir, No Telp / WA, dll) diabaikan total dan TIDAK masuk ke database.
    - Memproses baris secara kilat via _process_teacher_batch.
    """
    errors = []
    # Standar format export Tahfidz_MIS: [0: No, 1: Nama Guru, 2: Jenis Kelamin, 3: NIP, 4: Wali Kelas, 5: Murid Ampu, 6: TTL, 7: Telp, 8: Email]
    idx_name = col_map.get('name', 1)
    idx_nip = col_map.get('nip', 3)
    idx_email = col_map.get('email', 8)

    rows_data = []
    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if r_idx <= header_row_idx or not row:
            continue

        def get_val(idx):
            if idx is not None and idx < len(row):
                return _clean_student_cell_value(row[idx])
            return ""

        raw_nip = get_val(idx_nip)
        raw_name = get_val(idx_name)
        raw_email = get_val(idx_email)

        if not raw_nip and not raw_name:
            continue

        rows_data.append({
            'r_idx': r_idx,
            'nip': raw_nip,
            'name': raw_name,
            'email': raw_email
        })

    res = _process_teacher_batch(rows_data, errors)
    res['format_name'] = "Export Data Guru Tahfidz_MIS / Risalah"
    return res


def _import_teachers_from_standard_template(ws, header_row_idx, col_map):
    """
    FUNGSI 2: Mengambil data guru dari template resmi E-Ujian / Ujian SDMIS (Template_Import_Guru_E-Ujian.xlsx).
    Logika Khusus:
    - Mengambil kolom sesuai template standar: [No, NIP, Nama Guru, Email].
    - Memproses baris secara kilat via _process_teacher_batch.
    """
    errors = []
    # Standar template E-Ujian: [1: NIP, 2: Nama Guru, 3: Email]
    idx_nip = col_map.get('nip', 1)
    idx_name = col_map.get('name', 2)
    idx_email = col_map.get('email', 3)

    rows_data = []
    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if r_idx <= header_row_idx or not row:
            continue

        def get_val(idx):
            if idx is not None and idx < len(row):
                return _clean_student_cell_value(row[idx])
            return ""

        raw_nip = get_val(idx_nip)
        raw_name = get_val(idx_name)
        raw_email = get_val(idx_email)

        if not raw_nip and not raw_name:
            continue

        rows_data.append({
            'r_idx': r_idx,
            'nip': raw_nip,
            'name': raw_name,
            'email': raw_email
        })

    res = _process_teacher_batch(rows_data, errors)
    res['format_name'] = "Template Standar E-Ujian"
    return res


class TeacherExcelImportView(APIView):
    """
    POST /api/accounts/teachers/import-excel/
    Mengimpor data guru massal secara dinamis & kilat:
    1. Mendukung Berkas Export Risalah / Tahfidz_MIS (otomatis filter kolom NIP, Nama Guru, Email saja).
    2. Mendukung Berkas Template Standar E-Ujian (Template_Import_Guru_E-Ujian.xlsx).
    3. Terhubung langsung dan tersinkronisasi otomatis dengan Manajemen Pengguna.
    """
    permission_classes = [IsTeacherRole]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"success": False, "error": "Harap pilih berkas Excel (.xlsx)!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({"success": False, "error": f"Gagal membaca berkas Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        detected_format = "STANDARD"
        header_row_idx = None
        col_map = {}

        for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            if not row:
                continue
            row_str = [str(c or '').strip().lower() for c in row]
            
            if any(k in h for h in row_str for k in ['nip', 'no induk']) or any(k in h for h in row_str for k in ['nama', 'guru']):
                header_row_idx = r_idx
                if any('murid ampu' in h or 'wali kelas' in h or 'no telp' in h for h in row_str):
                    detected_format = "TAHFIDZ_MIS"
                else:
                    detected_format = "STANDARD"

                for c_idx, h in enumerate(row_str):
                    if ('nip' in h or h in ['no induk', 'username']) and 'jenis' not in h:
                        if 'nip' not in col_map:
                            col_map['nip'] = c_idx
                    elif any(k in h for k in ['nama guru', 'nama lengkap', 'nama', 'name', 'guru']) and 'name' not in col_map:
                        col_map['name'] = c_idx
                    elif 'email' in h and 'email' not in col_map:
                        col_map['email'] = c_idx
                break

        if header_row_idx is None or 'nip' not in col_map:
            if ws.title and ('guru' in ws.title.lower() or 'tahfidz' in ws.title.lower()):
                detected_format = "TAHFIDZ_MIS"
                header_row_idx = 1
                col_map = {'name': 1, 'nip': 3, 'email': 8}
            else:
                detected_format = "STANDARD"
                header_row_idx = 4
                col_map = {'nip': 1, 'name': 2, 'email': 3}

        # Eksekusi fungsi import sesuai format yang terdeteksi
        try:
            if detected_format == "TAHFIDZ_MIS":
                result = _import_teachers_from_tahfidz_mis(
                    ws=ws,
                    header_row_idx=header_row_idx,
                    col_map=col_map
                )
            else:
                result = _import_teachers_from_standard_template(
                    ws=ws,
                    header_row_idx=header_row_idx,
                    col_map=col_map
                )

            format_label = result.get("format_name", "Template Standar")
            return Response({
                "success": True,
                "message": f"Impor data guru berhasil ({format_label})! {result['created_count']} guru baru terdaftar (akun aktif pw=NIP), {result['updated_count']} data diperbarui.",
                "created_count": result['created_count'],
                "updated_count": result['updated_count'],
                "total_rows": result['total_rows'],
                "detected_format": detected_format,
                "format_label": format_label,
                "errors": result['errors']
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Error executing teacher excel import batch")
            return Response({
                "success": False,
                "error": f"Gagal memproses impor data guru: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# PENGATURAN SEKOLAH (DYNAMIC SCHOOL SETTINGS)
# ==========================================
class SchoolSettingView(APIView):
    """
    GET /api/accounts/school-settings/ -> Ambil informasi sekolah aktif
    PUT / PATCH /api/accounts/school-settings/ -> Perbarui data sekolah (Guru/Admin)
    """
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsTeacherRole()]
        return [permissions.AllowAny()]

    def get(self, request):
        setting = SchoolSetting.get_settings()
        serializer = SchoolSettingSerializer(setting)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self._update(request, partial=False)

    def patch(self, request):
        return self._update(request, partial=True)

    def _update(self, request, partial):
        setting = SchoolSetting.get_settings()
        serializer = SchoolSettingSerializer(setting, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
