import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, UserCheck, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

/**
 * Modal Peringatan Keamanan & Lengkapi Profil Pengguna
 * Muncul saat user pertama kali login dan mendeteksi data profil belum lengkap
 * atau kata sandi masih menggunakan bawaan sistem (NIP/default).
 */
export default function WelcomeProfileModal({ user, onClose }) {
  const navigate = useNavigate();

  const isStudent = user?.role === 'STUDENT';
  const targetProfileUrl = isStudent ? '/student/profile' : '/teacher/profile';

  const handleNavigateToProfile = () => {
    sessionStorage.setItem('dismiss_profile_welcome_modal', 'true');
    onClose();
    navigate(targetProfileUrl);
  };

  const handleDismissLater = () => {
    sessionStorage.setItem('dismiss_profile_welcome_modal', 'true');
    onClose();
  };

  const isPasswordDefault = user?.is_password_default;
  const isProfileIncomplete = !user?.is_profile_complete;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A1D11]/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#EFF9CE] rounded-3xl shadow-2xl border-2 border-[#8BC829] overflow-hidden animate-zoom-in">
        {/* Header Dark Forest */}
        <div className="p-6 bg-gradient-to-r from-[#102919] to-[#1F4B2C] text-white border-b-2 border-[#C3E956]/40">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#C3E956]/20 border border-[#C3E956]/40 flex items-center justify-center text-[#C3E956] shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#C3E956]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#C3E956] uppercase tracking-wider block">
                Pemberitahuan Keamanan • {isStudent ? 'Siswa' : 'Pengawas'}
              </span>
              <h3 className="text-base font-black text-white tracking-tight mt-0.5">
                Konfigurasi Kredensial Akun
              </h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                Halo <strong className="text-[#C3E956] font-bold">{user?.fullName || user?.full_name || user?.username}</strong>, demi keamanan integritas asesmen, kami menyarankan Anda memperbarui profil dan mengganti kata sandi bawaan.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body: Highlight Warnings */}
        <div className="p-6 space-y-3.5 bg-[#EFF9CE]">
          <div className="space-y-2.5">
            {isPasswordDefault && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919]">
                <div className="p-2 rounded-xl bg-amber-400 text-amber-950 shrink-0 mt-0.5 font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-black text-[#102919]">Kata Sandi Bawaan Sistem</div>
                  <div className="text-[#1F4B2C] text-xs mt-0.5 font-medium">
                    Akun Anda masih memakai kata sandi bawaan ({isStudent ? 'NISN' : 'NIP'}). Harap perbarui ke sandi pribadi yang aman.
                  </div>
                </div>
              </div>
            )}

            {isProfileIncomplete && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919]">
                <div className="p-2 rounded-xl bg-[#C3E956] text-[#0A1D11] shrink-0 mt-0.5 font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-black text-[#102919]">Biodata Belum Lengkap</div>
                  <div className="text-[#1F4B2C] text-xs mt-0.5 font-medium">
                    Lengkapi alamat email aktif dan periksa nama lengkap untuk keperluan rekapitulasi berita acara asesmen.
                  </div>
                </div>
              </div>
            )}

            {!isPasswordDefault && !isProfileIncomplete && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-[#4D7111] shrink-0" />
                <span>Profil dan kredensial akun Anda sudah terpasang dengan baik.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={handleDismissLater}
              className="w-full sm:w-auto h-10 px-4 rounded-xl border-2 border-[#8BC829] bg-[#E2F4B4] hover:bg-[#D5EE9E] text-[#102919] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#4D7111]" />
              <span>Nanti Saja</span>
            </button>
            <button
              type="button"
              onClick={handleNavigateToProfile}
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#C3E956] hover:bg-[#b6df3c] text-[#0A1D11] text-xs font-black tracking-tight transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md border border-[#4D7111]/30 cursor-pointer"
            >
              <span>Lengkapi Profil</span>
              <ArrowRight className="w-4 h-4 text-[#0A1D11]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

