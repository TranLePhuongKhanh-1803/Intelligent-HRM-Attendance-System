import React from "react";
import { Link } from "react-router-dom";
import {
  FaCamera,
  FaBrain,
  FaUsers,
  FaCalendarAlt,
  FaCheckCircle,
  FaCubes,
  FaArrowRight,
} from "react-icons/fa";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="homepage-container">
      {/* Header */}
      <header className="hp-header">
        <div className="hp-logo">
          <FaCubes />
          <span>HRM System</span>
        </div>
        <nav className="hp-nav">
          <a href="#home">Trang chủ</a>
          <a href="#features">Tính năng</a>
          <a href="#about">Giới thiệu</a>
          <a href="#contact">Liên hệ</a>
        </nav>
        <div className="hp-auth-buttons">

          <Link to="/login" className="hp-btn hp-btn-primary">
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hp-hero">
        <div className="hp-hero-content">
          <h1 className="hp-hero-title">
            Hệ Thống Quản Lý <span>Nhân Sự Thông Minh</span>
          </h1>
          <p className="hp-hero-desc">
            Giải pháp HRM hiện đại tích hợp chấm công bằng AI Face ID,
            giúp quản lý nhân sự nhanh chóng và chính xác. Nâng tầm doanh nghiệp
            của bạn ngay hôm nay.
          </p>
          <div className="hp-hero-buttons">
            <Link to="/login" className="hp-btn hp-btn-primary hp-btn-lg">
              Đăng nhập ngay <FaArrowRight style={{ marginLeft: "8px" }} />
            </Link>
            <a href="#demo" className="hp-btn hp-btn-secondary hp-btn-lg">
              Xem demo
            </a>
          </div>
        </div>
        <div className="hp-hero-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
            alt="HRM Dashboard Preview"
            className="hp-hero-image"
          />
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="hp-features">
        <div className="hp-section-header">
          <h2 className="hp-section-title">Tính năng nổi bật</h2>
          <p className="hp-section-desc">
            Hệ thống cung cấp đầy đủ các công cụ để tự động hóa và nâng cao hiệu
            quả quản lý nhân sự.
          </p>
        </div>
        <div className="hp-grid">
          <div className="hp-feature-card">
            <div className="hp-feature-icon">
              <FaCamera />
            </div>
            <h3 className="hp-feature-title">Chấm công Face ID</h3>
            <p className="hp-feature-desc">
              Nhận diện khuôn mặt AI với độ chính xác cao, chống gian lận, không
              lo quên thẻ.
            </p>
          </div>
          <div className="hp-feature-card">
            <div className="hp-feature-icon">
              <FaBrain />
            </div>
            <h3 className="hp-feature-title">Phân tích AI thông minh</h3>
            <p className="hp-feature-desc">
              Phân tích cảm xúc, tuổi sinh học và trạng thái nhân viên mỗi khi
              chấm công bằng DeepFace AI.
            </p>
          </div>
          <div className="hp-feature-card">
            <div className="hp-feature-icon">
              <FaUsers />
            </div>
            <h3 className="hp-feature-title">Quản lý nhân viên</h3>
            <p className="hp-feature-desc">
              Lưu trữ và tổ chức hồ sơ, theo dõi tình trạng nhân sự từng phòng
              ban đầy đủ.
            </p>
          </div>
          <div className="hp-feature-card">
            <div className="hp-feature-icon">
              <FaCalendarAlt />
            </div>
            <h3 className="hp-feature-title">Theo dõi bảng công</h3>
            <p className="hp-feature-desc">
              Báo cáo chấm công realtime, hỗ trợ xuất file tự động và kết nối
              module lương.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="hp-about">
        <div className="hp-about-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
            alt="Team working together"
            className="hp-about-img"
          />
        </div>
        <div className="hp-about-content">
          <h2 className="hp-section-title">Tại sao chọn HRM System?</h2>
          <p className="hp-section-desc" style={{ marginLeft: 0 }}>
            Đươn giản hóa quy trình vận hành và tiết kiệm chi phí với nền tảng
            HRM tất cả trong một.
          </p>
          <ul className="hp-about-list">
            <li className="hp-about-item">
              <FaCheckCircle className="hp-about-item-icon" />
              <div className="hp-about-item-text">
                Tiết kiệm tới 60% thời gian quản lý hành chính nhân sự mỗi ngày.
              </div>
            </li>
            <li className="hp-about-item">
              <FaCheckCircle className="hp-about-item-icon" />
              <div className="hp-about-item-text">
                Loại bỏ hoàn toàn gian lận chấm công nhờ công nghệ Face ID độc
                quyền.
              </div>
            </li>
            <li className="hp-about-item">
              <FaCheckCircle className="hp-about-item-icon" />
              <div className="hp-about-item-text">
                Dễ sử dụng, giao diện thân thiện không yêu cầu đào tạo cho nhân
                viên.
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Demo Slider / Grid */}
      <section id="demo" className="hp-demo">
        <div className="hp-section-header">
          <h2 className="hp-section-title">Giao diện trực quan</h2>
          <p className="hp-section-desc">
            Trải nghiệm thiết kế tinh tế và trải nghiệm người dùng hoàn hảo.
          </p>
        </div>
        <div className="hp-demo-grid">
          <div className="hp-demo-card">
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"
              alt="Dashboard View"
            />
            <div className="hp-demo-caption">Dashboard Quản Trị</div>
          </div>
          <div className="hp-demo-card">
            <img
              src="https://images.unsplash.com/photo-1555421689-d68471e189f2?auto=format&fit=crop&w=600&q=80"
              alt="Face ID Tracking"
            />
            <div className="hp-demo-caption">Module Face ID AI</div>
          </div>
          <div className="hp-demo-card">
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
              alt="Data Management"
            />
            <div className="hp-demo-caption">Quản Lý Chuyên Sâu</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="hp-cta">
        <div className="hp-cta-inner">
          <h2>Bắt đầu quản lý nhân sự thông minh ngay hôm nay</h2>
          <p>
            Triển khai nhanh chóng, bảo mật tuyệt đối. Cơ hội chuyển đổi số
            doanh nghiệp của bạn đang ở đây.
          </p>
          <Link to="/login" className="hp-btn hp-btn-white hp-btn-lg">
            Đăng nhập hệ thống
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="hp-footer">
        <div className="hp-footer-content">
          <div className="hp-footer-brand">
            <div className="hp-footer-logo">
              <FaCubes /> HRM System
            </div>
            <p>
              Giải pháp phần mềm quản lý nhân sự toàn diện, đồng hành cùng sự
              đột phá của doanh nghiệp.
            </p>
          </div>
          <div className="hp-footer-links">
            <h4>Sản phẩm</h4>
            <ul>
              <li>
                <a href="#features">Tính năng</a>
              </li>
              <li>
                <a href="#demo">Giao diện (Demo)</a>
              </li>
              <li>
                <a href="#">Bảng giá</a>
              </li>
            </ul>
          </div>
          <div className="hp-footer-links">
            <h4>Hỗ trợ</h4>
            <ul>
              <li>
                <a href="#">Trung tâm trợ giúp</a>
              </li>
              <li>
                <a href="#">Tài liệu API</a>
              </li>
              <li>
                <a href="#">Bảo mật</a>
              </li>
            </ul>
          </div>
          <div className="hp-footer-links">
            <h4>Liên hệ</h4>
            <ul>
              <li>Email: 2004khanh2004@gmail.com</li>
              <li>Phone: (091) 189-7419</li>
              <li>
                Địa chỉ: Khoa CNTT - Chuyên Ngành HTTT-IUH-12 Nguyễn Văn Bảo Gò
                Vấp Hồ Chí Minh
              </li>
            </ul>
          </div>
        </div>
        <div className="hp-footer-bottom">
          &copy; {new Date().getFullYear()} Intelligent HRM System. Designed for
          Graduation Project.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
