
export default function StatCard({
  title,
  value,
  icon,
  suffix = ""
}) {
  return (
    <div className="col-md-6 col-xl-3">
      <div className="card bg-dark text-white border-secondary h-100">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-secondary">
              {title}
            </span>

            <i
              className={`bi ${icon} text-warning`}
              style={{ fontSize: "26px" }}
            ></i>
          </div>

          <h2 className="fw-bold mb-0">
            {Number(value).toLocaleString("th-TH")}
            <span className="fs-6 text-secondary ms-2">
              {suffix}
            </span>
          </h2>
        </div>
      </div>
    </div>
  );
}
