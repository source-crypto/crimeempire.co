import Dashboard from './pages/Dashboard';
import Crew from './pages/Crew';
import Territories from './pages/Territories';
import Heists from './pages/Heists';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Crew": Crew,
    "Territories": Territories,
    "Heists": Heists,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};