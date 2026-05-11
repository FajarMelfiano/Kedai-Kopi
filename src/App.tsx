import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, Calendar, MapPin, Phone, Instagram, Clock, ChevronRight, CheckCircle2, AlertCircle, Menu as MenuIcon, X, User, LayoutDashboard, LogOut, Check, Trash2, Table as TableIcon } from 'lucide-react';
import { db, auth, loginWithGoogle, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { MenuItem, Booking } from './types';

const ADMIN_EMAIL = 'orioon700@gmail.com';

// Components
const addHours = (time: string, hours: number) => {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(Math.min(newH, 23)).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const BookingDetail = ({ booking, onBack }: { booking: Booking; onBack: () => void }) => {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-natural-50">
      <div className="max-w-4xl mx-auto px-6">
        <button 
          onClick={onBack}
          className="text-[10px] uppercase font-bold text-natural-400 hover:text-natural-700 mb-8 flex items-center gap-1 tracking-widest transition-colors"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Kembali ke Daftar
        </button>

        <div className="bg-white border border-natural-200 rounded-[40px] overflow-hidden shadow-2xl shadow-natural-900/5">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-10 md:p-14">
              <div className="mb-10">
                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-6 ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  Status: {booking.status === 'pending' ? 'Menunggu Konfirmasi' : booking.status === 'confirmed' ? 'Terkonfirmasi' : 'Dibatalkan'}
                </span>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 mb-4">Informasi Reservasi</h1>
                <p className="text-natural-500 italic">ID Reservasi: <span className="text-natural-800 font-mono not-italic uppercase tracking-tighter">{booking.id}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest block mb-2">Nama Pemesan</label>
                    <p className="text-lg font-serif font-bold text-natural-900">{booking.name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest block mb-2">Kontak</label>
                    <p className="text-sm text-natural-700">{booking.email}</p>
                    <p className="text-sm text-natural-700">{booking.phone}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest block mb-2">Jadwal</label>
                    <p className="text-lg font-serif font-bold text-natural-900">{booking.date}</p>
                    <p className="text-sm text-natural-700">{booking.time} — {booking.endTime || addHours(booking.time, 5)} WIB</p>
                    <p className="text-[10px] text-natural-400 uppercase font-bold mt-1 tracking-widest">(Durasi 5 Jam)</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest block mb-2">Detail Meja</label>
                    <p className="text-lg font-serif font-bold text-natural-900">Meja {booking.tableId}</p>
                    <p className="text-sm text-natural-700">{booking.guests} Tamu</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-8 bg-natural-50 rounded-3xl border border-natural-100 flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-white p-2 rounded-2xl border border-natural-200 flex items-center justify-center">
                  <div className="w-full h-full bg-natural-900 rounded-lg flex items-center justify-center">
                     <CheckCircle2 className="text-white w-12 h-12" />
                  </div>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h4 className="font-bold text-natural-900 mb-2">Check-in Digital</h4>
                  <p className="text-xs text-natural-500 leading-relaxed italic">Tunjukkan halaman ini kepada staf kami saat Anda tiba di Aroma Bumi. Kami akan segera mengantar Anda ke Meja {booking.tableId}.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-natural-100/50 p-10 border-l border-natural-200">
               <div className="h-full flex flex-col">
                  <h3 className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-6">Lokasi Meja Anda</h3>
                  <div className="flex-1 min-h-[300px]">
                    <TableLayout 
                      selectedTable={booking.tableId} 
                      onSelect={() => {}} 
                      guests={booking.guests} 
                    />
                  </div>
                  <p className="mt-6 text-[10px] text-natural-400 text-center uppercase tracking-widest font-bold">Lantai 1 — Area {TABLES.find(t => t.id === booking.tableId)?.type}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyBookings = ({ onDetails }: { onDetails: (b: Booking) => void }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBookings = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'bookings'), 
          where('email', '==', auth.currentUser.email),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, []);

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center bg-natural-50">
      <div className="w-10 h-10 border-4 border-natural-700 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-natural-500 font-medium tracking-tight">Memuat reservasi Anda...</p>
    </div>
  );

  return (
    <div className="min-h-screen pt-32 pb-20 bg-natural-50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-natural-900 mb-2">Reservasi Saya</h1>
          <p className="text-natural-500 italic">Riwayat kunjungan Anda ke Aroma Bumi.</p>
        </div>

        <div className="grid gap-6">
          {bookings.map((booking) => (
            <motion.button 
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onDetails(booking)}
              className="w-full text-left bg-white border border-natural-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-natural-300 transition-all group"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status === 'pending' ? 'Sedang Diproses' : booking.status === 'confirmed' ? 'Dikonfirmasi' : 'Dibatalkan'}
                    </span>
                    <span className="text-natural-300 text-xs font-medium">Ref: {booking.id?.slice(-6).toUpperCase()}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-natural-900 mb-1 group-hover:text-natural-700 transition-colors">{booking.date} @ {booking.time} — {booking.endTime || addHours(booking.time, 5)}</h3>
                    <div className="flex items-center gap-4 text-natural-500 text-sm">
                      <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {booking.guests} Tamu</span>
                      <span className="flex items-center gap-1.5"><TableIcon className="w-4 h-4" /> Meja {booking.tableId}</span>
                    </div>
                  </div>
                </div>

                <div className="md:text-right flex flex-col justify-between items-end">
                  <div className="text-xs text-natural-400 font-bold uppercase tracking-widest mb-4">
                    Lihat Detail
                    <ChevronRight className="w-4 h-4 inline-block ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                  {booking.status === 'confirmed' && (
                    <div className="p-4 bg-natural-50 rounded-2xl border border-natural-100 w-full md:w-auto">
                       <p className="text-[10px] text-natural-500 leading-relaxed uppercase font-bold tracking-widest">Siap untuk digunakan.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
          
          {bookings.length === 0 && (
            <div className="py-24 text-center bg-white border border-natural-200 border-dashed rounded-[40px]">
               <div className="w-16 h-16 bg-natural-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-8 h-8 text-natural-200" />
               </div>
              <p className="text-natural-400 font-serif italic text-lg mb-6">Anda belum memiliki riwayat reservasi.</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-booking'))}
                className="bg-natural-700 text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-natural-800 transition-all shadow-xl shadow-natural-700/20"
              >
                Buat Reservasi Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ onOpenBooking, setView, currentView }: { onOpenBooking: () => void; setView: (v: 'home' | 'admin' | 'my-bookings' | 'booking-detail') => void; currentView: 'home' | 'admin' | 'my-bookings' | 'booking-detail' }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
    };
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled || currentView === 'admin' ? 'bg-natural-900/95 backdrop-blur-md py-3 shadow-lg' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <button onClick={() => setView('home')} className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <Coffee className="w-6 h-6 text-natural-300" />
            <span className="text-2xl font-serif font-bold text-natural-50 tracking-tight leading-none">Aroma Bumi</span>
          </div>
          <span className="text-[8px] uppercase tracking-[0.3em] text-natural-300/60 mt-1 font-bold ml-8">Kedai Kopi & Ruang Temu</span>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          {currentView === 'home' ? (
            <>
              <a href="#menu" className="text-natural-100/70 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-[0.2em] border-b border-transparent hover:border-white/20 pb-1">Menu</a>
              <a href="#about" className="text-natural-100/70 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-[0.2em] border-b border-transparent hover:border-white/20 pb-1">Kisah Kami</a>
              <button 
                onClick={onOpenBooking}
                className="bg-natural-700 hover:bg-natural-800 text-natural-50 px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/20"
              >
                Reservasi
              </button>
            </>
          ) : (
            <button 
              onClick={() => setView('home')}
              className="text-natural-100/70 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-[0.2em]"
            >
              Kembali ke Beranda
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-6">
              {isAdmin && currentView === 'home' && (
                <button 
                  onClick={() => setView('admin')}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Admin
                </button>
              )}
              {currentView === 'home' && !isAdmin && (
                <button 
                  onClick={() => setView('my-bookings')}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Pemesanan Saya
                </button>
              )}
              <span className="text-natural-300 text-[10px] font-bold uppercase tracking-wider">{user.displayName?.split(' ')[0]}</span>
              <button onClick={logout} className="text-white/40 hover:text-white transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="ml-2 text-white/60 hover:text-white transition-colors flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Masuk</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-natural-900 p-8 flex flex-col gap-6 md:hidden border-t border-white/5"
          >
            {currentView === 'home' && (
              <>
                <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} className="text-white text-2xl font-serif italic">Menu</a>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="text-white text-2xl font-serif italic">Kisah Kami</a>
                <button 
                  onClick={() => { onOpenBooking(); setIsMobileMenuOpen(false); }}
                  className="bg-natural-700 text-white py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg"
                >
                  Reservasi Meja
                </button>
              </>
            )}
            {isAdmin && (
              <button 
                onClick={() => { setView(currentView === 'admin' ? 'home' : 'admin'); setIsMobileMenuOpen(false); }}
                className="text-natural-300 text-lg font-serif italic border-t border-white/5 pt-4 flex items-center gap-3"
              >
                <LayoutDashboard className="w-5 h-5" />
                {currentView === 'admin' ? 'Lihat Website' : 'Panel Admin'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const TABLES = [
  { id: 'T1', x: '10%', y: '20%', capacity: 2, type: 'Window' },
  { id: 'T2', x: '10%', y: '40%', capacity: 4, type: 'Window' },
  { id: 'T3', x: '10%', y: '60%', capacity: 4, type: 'Window' },
  { id: 'T4', x: '10%', y: '80%', capacity: 2, type: 'Window' },
  { id: 'T5', x: '45%', y: '30%', capacity: 4, type: 'Center' },
  { id: 'T6', x: '45%', y: '50%', capacity: 8, type: 'Center' },
  { id: 'T7', x: '45%', y: '70%', capacity: 8, type: 'Center' },
  { id: 'T8', x: '80%', y: '25%', capacity: 8, type: 'Lounge' },
  { id: 'T9', x: '80%', y: '55%', capacity: 8, type: 'Booth' },
  { id: 'T10', x: '80%', y: '80%', capacity: 4, type: 'Booth' },
];

const TableLayout = ({ selectedTable, onSelect, guests, occupiedTables = [] }: { selectedTable: string; onSelect: (id: string) => void; guests: number; occupiedTables?: string[] }) => {
  const guestsNum = Number(guests) || 0;
  
  return (
    <div className="relative w-full aspect-[4/3] bg-natural-50 rounded-3xl border border-natural-200 overflow-hidden p-8 shadow-inner">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-natural-200 px-6 py-1 rounded-b-xl text-[8px] uppercase font-bold text-natural-500 tracking-widest">Entrance</div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-natural-100 py-6 px-1 rounded-l-xl text-[8px] uppercase font-bold text-natural-400 tracking-widest [writing-mode:vertical-lr]">Coffee Bar</div>
      
      {TABLES.map((table) => {
        const isSelected = selectedTable === table.id;
        const isOccupied = occupiedTables.includes(table.id);
        const isTooSmall = table.capacity < guestsNum;
        const isDisabled = isOccupied || isTooSmall;
        
        return (
          <motion.button
            key={table.id}
            type="button"
            whileHover={!isDisabled ? { scale: 1.1 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            onClick={() => !isDisabled && onSelect(table.id)}
            disabled={isDisabled}
            style={{ left: table.x, top: table.y }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all ${
              isSelected ? 'z-10' : 'z-0'
            } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isOccupied ? 'bg-red-50 text-red-300 border-2 border-red-100 opacity-60' :
              isSelected ? 'bg-natural-700 text-white border-4 border-natural-300' : 
              isTooSmall ? 'bg-natural-100 text-natural-300 opacity-50' :
              'bg-white text-natural-600 border border-natural-200 hover:border-natural-400'
            }`}>
              <TableIcon className={`${table.capacity >= 4 ? 'w-6 h-6' : 'w-4 h-4'}`} />
            </div>
            <span className={`mt-2 text-[8px] font-bold uppercase tracking-widest ${
              isOccupied ? 'text-red-400' :
              isSelected ? 'text-natural-800' : 
              isTooSmall ? 'text-natural-300' : 
              'text-natural-400'
            }`}>
              {table.id} {isOccupied ? '(Full)' : `(${table.capacity}p)`}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, { status });
      setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const deleteBooking = async (id: string) => {
    if (!window.confirm('Hapus reservasi ini?')) return;
    try {
      await deleteDoc(doc(db, 'bookings', id));
      setBookings(bookings.filter(b => b.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center bg-natural-50">
      <div className="w-10 h-10 border-4 border-natural-700 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-natural-500 font-medium">Memuat data reservasi...</p>
    </div>
  );

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  return (
    <div className="min-h-screen pt-32 pb-20 bg-natural-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 mb-2">Panel Reservasi</h1>
            <p className="text-natural-500 italic">Kelola semua pemesanan meja Aroma Bumi.</p>
          </div>
          <button 
            onClick={fetchBookings}
            className="text-[10px] uppercase font-bold text-natural-400 hover:text-natural-700 transition-colors flex items-center gap-2 tracking-[0.2em]"
          >
            Refresh Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-natural-400 tracking-widest block mb-2">Total</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-serif font-bold text-natural-900">{stats.total}</span>
              <Calendar className="w-5 h-5 text-natural-200" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest block mb-2">Menunggu</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-serif font-bold text-natural-900">{stats.pending}</span>
              <Clock className="w-5 h-5 text-yellow-100" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-green-500 tracking-widest block mb-2">Dikonfirmasi</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-serif font-bold text-natural-900">{stats.confirmed}</span>
              <CheckCircle2 className="w-5 h-5 text-green-100" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-natural-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-red-500 tracking-widest block mb-2">Dibatalkan</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-serif font-bold text-natural-900">{stats.cancelled}</span>
              <X className="w-5 h-5 text-red-100" />
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {bookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-natural-200 rounded-[32px] p-6 md:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {booking.status === 'pending' ? 'Menunggu' : booking.status === 'confirmed' ? 'Dikonfirmasi' : 'Dibatalkan'}
                  </span>
                  <span className="text-natural-300 font-mono text-[10px] uppercase tracking-tighter">ID: {booking.id?.slice(-8)}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-natural-900 mb-2">{booking.name}</h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-natural-500">{booking.email}</p>
                      <p className="text-sm text-natural-500 font-bold">{booking.phone}</p>
                    </div>
                  </div>

                  <div className="bg-natural-50 p-6 rounded-3xl border border-natural-100">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-natural-700" />
                      <span className="text-lg font-serif font-bold text-natural-900">{booking.date}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-natural-400" />
                        <span className="text-sm font-bold text-natural-700 uppercase tracking-widest">{booking.time} — {booking.endTime || addHours(booking.time, 5)} WIB</span>
                      </div>
                      <p className="text-[9px] uppercase font-bold text-natural-300 tracking-widest ml-8">Durasi 5 Jam</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="w-10 h-10 bg-natural-900 text-white rounded-xl flex items-center justify-center font-serif font-bold">
                          {booking.tableId}
                       </div>
                       <div>
                          <p className="text-[10px] uppercase font-bold text-natural-400 tracking-widest">Meja Pilihan</p>
                          <p className="text-sm font-bold text-natural-900">{booking.guests} Tamu</p>
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-natural-100 flex items-center gap-2 text-[10px] uppercase font-bold text-natural-300 tracking-[0.2em]">
                   Dipesan pada {booking.createdAt ? new Date(booking.createdAt.toDate()).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className="flex lg:flex-col items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-natural-100 pt-6 lg:pt-0 lg:pl-10">
                {booking.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => updateStatus(booking.id!, 'confirmed')}
                      className="flex-1 lg:w-full p-4 bg-natural-700 text-natural-50 rounded-2xl hover:bg-natural-800 shadow-lg shadow-natural-700/20 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <Check className="w-4 h-4" />
                      Terima
                    </button>
                    <button 
                      onClick={() => updateStatus(booking.id!, 'cancelled')}
                      className="flex-1 lg:w-full p-4 border border-natural-200 text-natural-400 rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <X className="w-4 h-4" />
                      Tolak
                    </button>
                  </>
                ) : (
                  <div className="flex-1 lg:w-full flex items-center justify-center py-4">
                     <span className="text-[10px] uppercase font-bold text-natural-300 tracking-widest italic">Selesai</span>
                  </div>
                )}
                <button 
                  onClick={() => deleteBooking(booking.id!)}
                  className="p-4 text-natural-200 hover:text-red-500 transition-colors"
                  title="Hapus Permanen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
          
          {bookings.length === 0 && (
            <div className="py-20 text-center bg-white border border-natural-200 border-dashed rounded-3xl">
              <p className="text-natural-400 italic">Belum ada reservasi masuk.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BookingModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [step, setStep] = useState<'form' | 'table' | 'success' | 'loading'>('form');
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: 2,
    tableId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');

    try {
      const requestedStartTime = formData.time;
      const requestedEndTime = addHours(requestedStartTime, 5);

      // Check availability for chosen date
      const q = query(
        collection(db, 'bookings'), 
        where('date', '==', formData.date),
        where('status', 'in', ['pending', 'confirmed'])
      );
      
      const querySnapshot = await getDocs(q);
      const existingBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      // Filter for overlapping bookings
      const occupied = existingBookings
        .filter(b => {
          const bStart = b.time;
          const bEnd = b.endTime || addHours(b.time, 5);
          
          // Overlap logic: (startNew < endOld) && (endNew > startOld)
          return (requestedStartTime < bEnd) && (requestedEndTime > bStart);
        })
        .map(b => b.tableId);

      setOccupiedTables(occupied);
      setStep('table');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      setStep('form');
    }
  };

  const handleConfirmBooking = async () => {
    if (!formData.tableId) return;
    setStep('loading');
    
    try {
      const path = 'bookings';
      await addDoc(collection(db, path), {
        ...formData,
        endTime: addHours(formData.time, 5),
        status: 'pending',
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || null
      });
      setStep('success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bookings');
      setStep('form');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-natural-200"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-natural-300 hover:text-natural-900 transition-colors z-10">
          <X className="w-6 h-6" />
        </button>

        <div className="p-10">
          {step === 'form' && (
            <>
              <h2 className="text-4xl font-serif font-bold text-natural-900 mb-2">Reservasi Meja</h2>
              <p className="text-natural-500 text-sm mb-8 italic">Langkah 1: Isi detail kedatangan Anda.</p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-2 block">Nama Lengkap</label>
                  <input 
                    required
                    placeholder="E.g. Andi Wijaya"
                    className="w-full bg-transparent border border-natural-300 rounded-2xl px-4 py-3.5 focus:border-natural-700 outline-none transition-all placeholder:text-natural-300"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-2 block">Tanggal</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-transparent border border-natural-300 rounded-2xl px-4 py-3.5 focus:border-natural-700 outline-none transition-all"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-2 block">Waktu</label>
                    <input 
                      required
                      type="time" 
                      className="w-full bg-transparent border border-natural-300 rounded-2xl px-4 py-3.5 focus:border-natural-700 outline-none transition-all"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-2 block">Jumlah Orang</label>
                  <select 
                    className="w-full bg-transparent border border-natural-300 rounded-2xl px-4 py-3.5 focus:border-natural-700 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.guests}
                    onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
                  >
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Orang' : 'Orang'}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-2 block">Email</label>
                    <input 
                      required
                      type="email"
                      placeholder="andi@gmail.com"
                      className="w-full bg-transparent border border-natural-300 rounded-2xl px-4 py-3.5 focus:border-natural-700 outline-none transition-all placeholder:text-natural-300"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-natural-400 tracking-widest mb-2 block">Nomor Telepon</label>
                    <input 
                      required
                      placeholder="+62 8..."
                      className="w-full bg-transparent border border-natural-300 rounded-2xl px-4 py-3.5 focus:border-natural-700 outline-none transition-all placeholder:text-natural-300"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-natural-700 text-natural-50 py-4 rounded-full font-bold uppercase tracking-widest text-xs mt-4 hover:bg-natural-800 transition-all shadow-xl shadow-natural-700/20 flex items-center justify-center gap-2"
                >
                  Pilih Meja
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {step === 'table' && (
            <>
              <div className="mb-8">
                <button 
                  onClick={() => setStep('form')}
                  className="text-[10px] uppercase font-bold text-natural-400 hover:text-natural-700 mb-4 flex items-center gap-1 tracking-widest"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  Kembali ke Detail
                </button>
                <h2 className="text-4xl font-serif font-bold text-natural-900 mb-2">Denah Ruangan</h2>
                <p className="text-natural-500 text-sm italic mb-6">Langkah 2: Pilih posisi meja yang Anda inginkan.</p>
                
                <div className="bg-natural-50 p-4 rounded-3xl border border-natural-200 flex flex-wrap gap-6 items-center shadow-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-natural-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-natural-700">{formData.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-natural-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-natural-700">{formData.time} — {addHours(formData.time, 5)} WIB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-natural-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-natural-700">{formData.guests} Tamu</span>
                  </div>
                </div>
              </div>

              <TableLayout 
                guests={formData.guests}
                selectedTable={formData.tableId} 
                onSelect={(id) => setFormData({...formData, tableId: id})}
                occupiedTables={occupiedTables}
              />

              <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-natural-500 text-sm italic">
                  {formData.tableId ? (
                    <span>Terpilih: <span className="text-natural-900 font-bold font-serif not-italic">Meja {formData.tableId}</span></span>
                  ) : !TABLES.some(t => t.capacity >= formData.guests) ? (
                    <span className="text-red-500 font-bold">Maaf, kapasitas meja kami maksimal untuk {Math.max(...TABLES.map(t => t.capacity))} orang.</span>
                  ) : TABLES.filter(t => t.capacity >= formData.guests && !occupiedTables.includes(t.id)).length === 0 ? (
                    <span className="text-red-500 font-bold">Semua meja untuk {formData.guests} orang sudah penuh di jam ini.</span>
                  ) : (
                    <span>Harap pilih satu meja yang tersedia.</span>
                  )}
                </div>
                <button 
                  onClick={handleConfirmBooking}
                  disabled={!formData.tableId}
                  className={`w-full md:w-auto px-12 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all shadow-xl ${
                    formData.tableId 
                    ? 'bg-natural-700 text-natural-50 hover:bg-natural-800 shadow-natural-700/20' 
                    : 'bg-natural-200 text-natural-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Finalisasi Reservasi
                </button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-4 border-natural-700 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-natural-600 animate-pulse font-medium">Memproses reservasi Anda...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-natural-100 text-natural-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-natural-900 mb-2">Terima Kasih!</h2>
              <p className="text-natural-600 mb-8 max-w-xs mx-auto text-sm">Reservasi Meja {formData.tableId} telah diterima. Kami telah mengirimkan detail ke {formData.email}.</p>
              <button 
                onClick={onClose}
                className="bg-natural-700 text-natural-50 px-10 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg shadow-natural-700/20"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [view, setView] = useState<'home' | 'admin' | 'my-bookings' | 'booking-detail'>('home');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const handleOpenBooking = () => setIsBookingOpen(true);
    window.addEventListener('open-booking', handleOpenBooking);
    return () => window.removeEventListener('open-booking', handleOpenBooking);
  }, []);

  const menuItems: MenuItem[] = [
    { id: '1', name: 'Signature Latte', price: 45000, description: 'Double shot espresso with creamy textured milk and a hint of vanilla.', category: 'coffee', image: 'https://www.aeki-aice.org/wp-content/uploads/2025/07/Coffee-Signature-Menu.webp' },
    { id: '2', name: 'Almond Croissant', price: 38000, description: 'Buttery, flaky pastry filled with house-made almond frangipane.', category: 'pastry', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800&auto=format&fit=crop' },
    { id: '3', name: 'Matcha Zen', price: 42000, description: 'Ceremonial grade Uji matcha with steamed oat milk.', category: 'tea', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=800&auto=format&fit=crop' },
    { id: '4', name: 'Cold Brew Citrus', price: 48000, description: '18-hour cold steeped coffee with fresh orange zest.', category: 'coffee', image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop' },
  ];

  return (
    <div className="min-h-screen selection:bg-natural-300 selection:text-natural-900">
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} setView={setView} currentView={view} />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />

      {view === 'admin' ? (
        <AdminDashboard />
      ) : view === 'my-bookings' ? (
        <MyBookings onDetails={(b) => { setSelectedBooking(b); setView('booking-detail'); }} />
      ) : view === 'booking-detail' && selectedBooking ? (
        <BookingDetail booking={selectedBooking} onBack={() => { setSelectedBooking(null); setView('my-bookings'); }} />
      ) : (
        <>
          {/* Hero Section */}
          <section className="relative h-screen flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop" 
                alt="Coffee Shop Interior" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#2C1B10] opacity-60" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 items-center h-full pt-20">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1 }}
                className="md:col-span-12 text-center"
              >
                <span className="inline-block text-natural-300 uppercase tracking-[0.4em] text-xs font-bold mb-8">Kedai Kopi & Ruang Temu</span>
                <h1 className="text-7xl md:text-[120px] font-serif font-bold text-white mb-10 leading-[0.85] tracking-tight">
                  Menyeduh <br /><span className="italic text-natural-300 font-light">Ketenangan.</span>
                </h1>
                <p className="text-natural-100/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                  Nikmati pengalaman minum kopi yang autentik di jantung kota. Setiap biji kopi kami dipilih langsung dari petani lokal untuk menghadirkan rasa yang jujur.
                </p>
                <div className="flex flex-col md:flex-row gap-6 justify-center">
                  <button 
                    onClick={() => setIsBookingOpen(true)}
                    className="bg-natural-700 hover:bg-natural-800 text-white px-12 py-5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-2xl shadow-black/40 hover:scale-105 active:scale-95"
                  >
                    Amankan Meja
                  </button>
                  <a 
                    href="#menu"
                    className="bg-white/5 hover:bg-white/10 backdrop-blur-md text-white border border-white/20 px-12 py-5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Lihat Menu
                  </a>
                </div>
              </motion.div>
            </div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-natural-400"
            >
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Gulir</span>
              <div className="w-[1px] h-12 bg-gradient-to-b from-natural-400 to-transparent opacity-40" />
            </motion.div>
          </section>

          {/* Info Bar */}
          <section className="bg-natural-50 border-y border-natural-200">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-natural-200">
              <div className="p-10 flex items-center gap-6">
                <div className="w-14 h-14 bg-natural-100 rounded-2xl flex items-center justify-center text-natural-700">
                  <MapPin className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-natural-400 mb-1">Lokasi Kami</h3>
                  <p className="text-sm font-serif font-bold text-natural-900 leading-tight">Jl. Senopati No. 12, Jakarta</p>
                </div>
              </div>
              <div className="p-10 flex items-center gap-6">
                <div className="w-14 h-14 bg-natural-100 rounded-2xl flex items-center justify-center text-natural-700">
                  <Clock className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-natural-400 mb-1">Jam Operasional</h3>
                  <p className="text-sm font-serif font-bold text-natural-900 leading-tight">08:00 — 22:00 Setiap Hari</p>
                </div>
              </div>
              <div className="p-10 flex items-center gap-6">
                <div className="w-14 h-14 bg-natural-100 rounded-2xl flex items-center justify-center text-natural-700">
                  <Instagram className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-natural-400 mb-1">Media Sosial</h3>
                  <p className="text-sm font-serif font-bold text-natural-900 leading-tight">@aromabumi.id</p>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Items Grid */}
          <section id="menu" className="py-32 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div>
                  <span className="text-natural-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-4 inline-block">Kurasi Musiman</span>
                  <h2 className="text-5xl md:text-6xl font-serif font-bold text-natural-900 leading-tight">Menu Spesialisasi.</h2>
                </div>
                <button className="text-[10px] uppercase tracking-widest font-bold text-natural-800 border-b border-natural-800 pb-1 hover:opacity-60 transition-opacity">
                  Unduh Menu PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                {menuItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ y: -10 }}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded-[32px] mb-8 relative shadow-xl shadow-natural-900/5">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-natural-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-bold text-natural-900 inline-block">
                          IDR {item.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-natural-900 mb-2">{item.name}</h3>
                    <p className="text-natural-500 text-sm leading-relaxed font-light line-clamp-2">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Story Section */}
          <section id="about" className="py-32 bg-natural-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-natural-300 rounded-full blur-[160px] translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
              <div className="lg:col-span-6">
                <span className="text-natural-300 font-bold tracking-[0.4em] text-[10px] mb-6 inline-block uppercase">Filosofi Aroma</span>
                <h2 className="text-5xl md:text-7xl font-serif font-bold mb-10 leading-tight">Menghargai <br /><span className="italic text-natural-300 font-light">Setiap Tetes.</span></h2>
                <div className="space-y-8 text-natural-100/60 leading-relaxed text-lg font-light">
                  <p>Berawal dari kecintaan pada tanah Nusantara, Aroma Bumi hadir sebagai jembatan antara petani kopi lokal dan penikmat rasa sejati. Kami percaya bahwa setiap cangkir memiliki cerita tentang dedikasi dan kesabaran.</p>
                  <p>Di Aroma Bumi, kami tidak sekadar menyajikan kafein. Kami meramu ketenangan, ruang untuk berdialog, dan waktu untuk berhenti sejenak dari hiruk-pikuk dunia luar.</p>
                </div>
                
                <div className="mt-16 flex gap-16 border-t border-white/10 pt-10">
                  <div>
                    <div className="text-5xl font-serif font-bold text-white mb-1">100%</div>
                    <div className="text-[10px] uppercase tracking-widest text-natural-400 font-bold">Biji Lokal</div>
                  </div>
                  <div>
                    <div className="text-5xl font-serif font-bold text-white mb-1">82+</div>
                    <div className="text-[10px] uppercase tracking-widest text-natural-400 font-bold">SCA Score</div>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-6 relative">
                <div className="grid grid-cols-2 gap-6">
                  <div className="w-full h-80 rounded-[40px] overflow-hidden bg-natural-300 relative shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" 
                      className="w-full h-full object-cover" 
                      alt="Coffee" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-natural-900/20" />
                  </div>
                  <div className="w-full h-80 rounded-[40px] overflow-hidden bg-natural-300 relative mt-16 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=800&auto=format&fit=crop" 
                      className="w-full h-full object-cover" 
                      alt="Cafe" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-natural-900/20" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-natural-50 py-24 border-t border-natural-200">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-16">
              <div className="md:col-span-5">
                <div className="flex items-center gap-3 mb-8">
                  <Coffee className="w-6 h-6 text-natural-700" />
                  <span className="text-2xl font-serif font-bold text-natural-900 tracking-tight">Aroma Bumi</span>
                </div>
                <p className="text-natural-600 max-w-sm mb-10 leading-relaxed font-light">Kami percaya bahwa kopi adalah bahasa universal tentang kedekatan dan kejujuran rasa.</p>
                <div className="flex gap-4">
                  <a href="#" className="w-12 h-12 bg-white border border-natural-200 rounded-full flex items-center justify-center text-natural-800 hover:bg-natural-700 hover:text-white transition-all shadow-sm"><Instagram className="w-5 h-5" /></a>
                  <a href="#" className="w-12 h-12 bg-white border border-natural-200 rounded-full flex items-center justify-center text-natural-800 hover:bg-natural-700 hover:text-white transition-all shadow-sm"><Coffee className="w-5 h-5" /></a>
                </div>
              </div>
              
              <div className="md:col-span-3">
                <h4 className="font-bold text-natural-900 uppercase text-[10px] tracking-[0.3em] mb-10">Tautan Cepat</h4>
                <ul className="space-y-6 text-natural-600 text-sm font-light">
                  <li><a href="#menu" className="hover:text-natural-900 transition-colors">Menu Musiman</a></li>
                  <li><a href="#about" className="hover:text-natural-900 transition-colors"> Filosofi Kami</a></li>
                  <li><button onClick={() => setIsBookingOpen(true)} className="hover:text-natural-900 transition-colors">Reservasi Meja</button></li>
                  <li><a href="#" className="hover:text-natural-900 transition-colors">Kebijakan Privasi</a></li>
                </ul>
              </div>

              <div className="md:col-span-4">
                <h4 className="font-bold text-natural-900 uppercase text-[10px] tracking-[0.3em] mb-10">Kontak Kami</h4>
                <ul className="space-y-6 text-natural-600 text-sm font-light">
                  <li className="flex items-start gap-4"><MapPin className="w-4 h-4 mt-0.5 text-natural-400" /> <div>Jl. Senopati No. 12, Jakarta Selatan<br />DKI Jakarta, 12190</div></li>
                  <li className="flex items-start gap-4"><Instagram className="w-4 h-4 mt-0.5 text-natural-400" /> @aromabumi.id</li>
                  <li className="flex items-start gap-4"><Clock className="w-4 h-4 mt-0.5 text-natural-400" /> 08:00 — 22:00</li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 mt-24 pt-10 border-t border-natural-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-natural-400 uppercase font-bold tracking-[0.2em]">
              <p>© 2024 Aroma Bumi Ruang Temu. Seluruh hak cipta dilindungi.</p>
              <div className="flex gap-10">
                <a href="#" className="hover:text-natural-900">Instagram</a>
                <a href="#" className="hover:text-natural-900">WhatsApp</a>
                <a href="#" className="hover:text-natural-900">Bekerjasama</a>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
