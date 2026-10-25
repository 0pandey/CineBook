import { Link } from "react-router-dom";
export default function MovieCard({ movie }) {
  return (
    <div className="col-6 col-md-4 col-lg-3">
      <div className="card movie-card bg-dark text-white border-secondary h-100 overflow-hidden">
        <img
          src={movie.poster}
          className="card-img-top movie-poster"
          alt={movie.title}
        />

        <div className="card-body d-flex flex-column">
          <h5 className="card-title fw-bold">{movie.title}</h5>

          <p className="text-secondary small mb-2">
            <i className="bi bi-clock me-1"></i>
            {movie.duration} นาที
          </p>

          <p className="text-secondary small mb-3">
            <i className="bi bi-film me-1"></i>
            {movie.genre}
          </p>

          <Link
            to={`/showtimes/${movie.id}`}
            className="btn btn-warning mt-auto"
          >
            ดูรอบฉาย
          </Link>
        </div>
      </div>
    </div>
  );
}
