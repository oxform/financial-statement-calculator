import "./App.css";
import "./globalStyles.scss";
import SampleList from "./components/SampleList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

function App() {
  return (
    <div className="App">
      <a
        href="https://github.com/oxform/financial-statement-calculator"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        aria-label="View source on GitHub"
      >
        <FontAwesomeIcon icon={faGithub} size="2x" />
      </a>
      <SampleList />
    </div>
  );
}

export default App;
