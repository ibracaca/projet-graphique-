# Pièces 10 et 11 : le backplate et l'équerre des sorties vidéo.
# Références : produit-4.webp et card-b-1.png (dos), vga_body-4.png (backplate seul),
# produit-5.webp (côté ports). Pas de dragon ni de texte : la fenêtre garde trois
# barres obliques, les verres et plaques restent lisses.
import math

import bmesh
import bpy
from mathutils import Matrix

from commun import (DIM, aretes_vives, arc_points, souder, biseauter, boite, booleen, cylindre, decouper,
                    fusionner, lier, lignes, lisser, materiau, prisme, tour, transformer, uv_plan, vide)

C = DIM['COQUE']
Z = DIM['Z']
D = DIM['DIAGONALE']
PCB = DIM['PCB']
FENETRE = DIM['FENETRE']
PORTS = DIM['PORTS']

X_MIN, X_MAX, Y_MAX = C['xMin'], C['xMax'], C['yMax']
Y_MIN_BP = -59
PENTE = (D['b'][1] - D['a'][1]) / (D['b'][0] - D['a'][0])
ANGLE_DIAG = math.degrees(math.atan(PENTE))  # environ 31°


def x_diagonale(y):
    return D['a'][0] + (y - D['a'][1]) / PENTE


def permuter(o, m):
    transformer(o, Matrix(m).to_4x4())
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()


def vis_bombee(nom, mat, rayon=2.3):
    """Vis à tête bombée et empreinte cruciforme, axe Z, tête vers -Z."""
    profil = [(0.0, 0.0), (rayon, 0.0), (rayon, -0.35)] + [(rayon * math.cos(t), -0.35 - 0.6 * math.sin(t)) for t in [i * math.pi / 2 / 6 for i in range(1, 7)]]
    o = tour(nom, profil, 32, mat, ferme=False, angle=50)
    souder(o)
    croix = [boite('croix_a', -1.1, 1.1, -0.28, 0.28, -2, -0.55), boite('croix_b', -0.28, 0.28, -1.1, 1.1, -2, -0.55)]
    booleen(o, croix)
    return o


# ---------------------------------------------------------------------------
def backplate():
    m_lisse = materiau('backplateLisse', (0.02, 0.02, 0.022), 0.5, 0.6)
    m_brosse = materiau('backplateBrosse', (0.3, 0.3, 0.32), 0.35, 1.0)
    m_vis = materiau('visSombre', (0.1, 0.1, 0.11), 0.3, 1.0)
    za, zv = Z['backplateArriere'], Z['backplateAvant']

    contour = [(X_MIN, Y_MIN_BP), (X_MAX - 3, Y_MIN_BP), (X_MAX, Y_MIN_BP + 3), (X_MAX, Y_MAX), (X_MIN, Y_MAX)]
    tole = prisme('backplate_tole', contour, za, zv, m_lisse)
    fen = prisme('fenetre', FENETRE, za - 2, zv + 2)
    booleen(tole, [fen])

    # Partie brossée, côté équerre de la diagonale : une peau de 0,3 mm, arête nette.
    brosse = prisme('backplate_brosse', [(X_MIN + 0.4, Y_MIN_BP + 0.4), (x_diagonale(Y_MIN_BP + 0.4), Y_MIN_BP + 0.4),
                                         (x_diagonale(Y_MAX - 0.4), Y_MAX - 0.4), (X_MIN + 0.4, Y_MAX - 0.4)], za - 0.3, za + 0.1, m_brosse)

    # Barres obliques de la fenêtre, en chevron avec la diagonale (produit-4.webp).
    a = -math.atan(PENTE)
    c, s = math.cos(a), math.sin(a)
    barres = []
    for i, cx in enumerate((98, 130, 162)):
        bande = [(cx + u * c - v * s, 6 + u * s + v * c) for u, v in ((-90, -2.4), (90, -2.4), (90, 2.4), (-90, 2.4))]
        morceau = decouper(bande, FENETRE)
        if len(morceau) > 2:
            barres.append(prisme(f'barre_fenetre_{i}', morceau, za + 0.2, zv - 0.2, m_lisse))

    # Plaque d'about, repliée côté écusson, percée pour le support anti-affaissement.
    about = boite('backplate_about', 179.5, 181.0, Y_MIN_BP, Y_MAX, za, -8, m_lisse)
    trous = []
    for y in (-40, -12, 16, 44):
        t = cylindre(f'trou_{y}', 0, 0, 1.6, -3, 3, 32)
        transformer(t, Matrix.Translation((180, y, -20)) @ Matrix.Rotation(math.radians(90), 4, 'Y'))
        trous.append(t)
    booleen(about, trous)

    nets = [tole, brosse, about] + barres
    s_fil, a_fil = aretes_vives(nets, 30)
    s_ar, a_ar = aretes_vives([tole, about], 30)

    biseauter(tole, 0.45, 2, 40)
    biseauter(about, 0.45, 2, 40)
    biseauter(brosse, 0.15, 1, 40)
    for b in barres:
        biseauter(b, 0.35, 2, 40)
    uv_plan(brosse, 1 / 60, ANGLE_DIAG, etirement=20)

    vis = []
    for i, (x, y) in enumerate(((-172, -56), (37, -54), (172, -52), (-171, 67), (37, 68), (172, 68))):
        v = vis_bombee(f'vis_{i}', m_vis)
        transformer(v, Matrix.Translation((x, y, za - 0.3 if x < x_diagonale(y) else za)))
        vis.append(v)

    racine = vide('backplate')
    corps = fusionner([tole, about] + barres, 'backplate_corps')
    lisser(corps, 35)
    lisser(brosse, 35)
    vis_ = fusionner(vis, 'backplate_vis')
    for o in (corps, brosse, vis_):
        o.parent = racine
    lignes('backplate__filaire', s_fil, a_fil, racine)
    lignes('backplate__aretes', s_ar, a_ar, racine)
    return racine


# ---------------------------------------------------------------------------
# Équerre : contour dessiné dans le plan (z, y) puis posé sur la face x = -179,5.
Z_PORTS = Z['pcbAvant'] + 4.2
X0 = -179.5


def vers_equerre(o, epaisseur_vers_x=True):
    """(z, y, e) vers (x, y, z) : la tôle épaisse de e vers +x à partir de X0."""
    permuter(o, [[0, 0, 1], [0, 1, 0], [1, 0, 0]])
    transformer(o, Matrix.Translation((X0, 0, 0)))


def contour_port(p, jeu=0.0):
    """Contour d'un port dans le plan (y, z) : DisplayPort à un coin coupé,
    HDMI en trapèze (deux coins coupés)."""
    dl, dh = p['largeur'] / 2 + jeu, p['hauteur'] / 2 + jeu
    y, z = p['y'], Z_PORTS
    k = 2.2 + jeu * 0.5
    if p.get('hdmi'):
        return [(y - dl + k, z - dh), (y + dl - k, z - dh), (y + dl, z - dh + k * 0.8), (y + dl, z + dh), (y - dl, z + dh), (y - dl, z - dh + k * 0.8)]
    return [(y - dl, z - dh), (y + dl - k, z - dh), (y + dl, z - dh + k), (y + dl, z + dh), (y - dl, z + dh)]


def prisme_x(nom, contour_yz, x0, x1, mat=None):
    """Contour (y, z) extrudé le long de x."""
    o = prisme(nom, contour_yz, x0, x1, mat)
    permuter(o, [[0, 0, 1], [1, 0, 0], [0, 1, 0]])
    return o


def equerre():
    m_acier = materiau('equerre', (0.5, 0.5, 0.52), 0.42, 1.0)
    m_port = materiau('portMetal', (0.6, 0.6, 0.62), 0.3, 1.0)
    m_noir = materiau('composant', (0.02, 0.02, 0.02), 0.6, 0.1)

    contour = [(-35.5, -60), (-31, -60), (-31, -74.5), (-28, -74.5), (-28, -60), (4.5, -60), (4.5, 62), (-35.5, 62)]
    tole = prisme('equerre_tole', contour, 0, 1.0, m_acier)
    vers_equerre(tole)
    patte = boite('equerre_patte', X0 - 10.5, X0 + 1.0, 62, 63, -35.5, 4.5, m_acier)
    fente = boite('fente_patte', X0 - 7.5, X0 - 3.5, 61, 64, -22, -14)
    booleen(patte, [fente])

    outils = []
    for i, p in enumerate(PORTS):
        outils.append(prisme_x(f'trou_port_{i}', contour_port(p, 0.6), X0 - 2, X0 + 3))
    for i, (ya, yb) in enumerate(((-52, -24), (-18, 14), (20, 54))):
        o = prisme(f'oui_{i}', [(-14, ya), (-14, yb - 6), (-8, yb), (1.5, yb), (1.5, ya + 6), (-4.5, ya)], -2, 3)
        vers_equerre(o)
        outils.append(o)
    booleen(tole, outils)

    # Ports : coque de tôle pliée, creuse, et languette de contact noire au fond.
    coques, languettes = [], []
    for i, p in enumerate(PORTS):
        c = prisme_x(f'port_{i}', contour_port(p, 0.0), X0 - 0.4, -160, m_port)
        creux = prisme_x(f'creux_{i}', contour_port(p, -0.45), X0 - 2, -166)
        booleen(c, [creux])
        coques.append(c)
        dl = p['largeur'] / 2 - 2.6
        lg = boite(f'languette_{i}', X0 + 2.5, -166, p['y'] - dl, p['y'] + dl, Z_PORTS - 0.9, Z_PORTS + 0.5, m_noir)
        languettes.append(lg)

    s_fil, a_fil = aretes_vives([tole, patte] + coques, 30)
    biseauter(tole, 0.25, 2, 40)
    biseauter(patte, 0.25, 2, 40)
    for c in coques:
        biseauter(c, 0.2, 2, 40)
    for lg in languettes:
        biseauter(lg, 0.15, 1, 40)

    racine = vide('equerre')
    acier = fusionner([tole, patte], 'equerre_tole')
    ports = fusionner(coques, 'equerre_ports')
    noir = fusionner(languettes, 'equerre_languettes')
    for o in (acier, ports, noir):
        lisser(o, 35)
        o.parent = racine
    uv_plan(acier, 1 / 80, 0, 'ZY')
    lignes('equerre__filaire', s_fil, a_fil, racine)
    return racine


def construire():
    backplate()
    equerre()
