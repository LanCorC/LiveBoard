package Server;

import java.util.ArrayList;

class Coord
{
    public int x;
    public int y;
}

class DragStart
{
    public int x;
    public int y;
}

class PlayMat
{
    public String type;
    public int id;
    public String touchStyle;
    public int index;
    public ArrayList<String> images;
    public int height;
    public int width;
    public Coord coord;
    public DragStart dragStart;
    public boolean disabled;
    public boolean anchored;
    public long selected;
    public boolean isDeck;
    public int flipMe;
    public Object timeStamp;
}

class Deck
{
    public String type;
    public int id;
    public String touchStyle;
    public int index;
    public ArrayList<Integer> images;
    public int height;
    public int width;
    public Coord coord;
    public DragStart dragStart;
    public boolean disabled;
    public long selected;
    public long browsing;
    public boolean isDeck;
    public boolean specialHover;
    public int flipMe;
    public Object timeStamp;
}

class Card
{
    public String type;
    public int id;
    public String touchStyle;
    public int index;
    public ArrayList<String> images;
    public int height;
    public int width;
    public Coord coord;
    public DragStart dragStart;
    public boolean disabled;
    public long selected;
    public boolean isDeck;
    public int flipMe;
    public Object timeStamp;
    public Object deck;
}

class Hand
{
    public boolean isHand;
    public long id;
    public boolean isDeck;
    public long selected;
    public ArrayList<Integer> images;
    public String type;
    public boolean disabled;
    public long browsing;
}

class User
{
    public long id;
    public String color;
    public String name;
    public int position;
    public Hand hand;
}

public class GameState
{
    public ArrayList<PlayMat> playMats;
    public ArrayList<Deck> decks;
    public ArrayList<Card> cards;
    public ArrayList<Object> tokens;
    public ArrayList<User> players;
}