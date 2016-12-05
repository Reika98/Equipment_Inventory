--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.1
-- Dumped by pg_dump version 9.5.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET search_path = public, pg_catalog;

--
-- Name: clusters; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE clusters AS ENUM (
    'Arts and Humanities',
    'Management',
    'Sciences',
    'Social Sciences',
    'Administration'
);


ALTER TYPE clusters OWNER TO postgres;

--
-- Name: condition_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE condition_type AS ENUM (
    'Working',
    'Disposed'
);


ALTER TYPE condition_type OWNER TO postgres;

--
-- Name: disposaltypes; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE disposaltypes AS ENUM (
    'Sale',
    'Transfer',
    'Destruction'
);


ALTER TYPE disposaltypes OWNER TO postgres;

--
-- Name: equipmenttypes; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE equipmenttypes AS ENUM (
    'IT Equipments',
    'Non-IT Equipment',
    'Furnitures and Fixtures',
    'Aircons',
    'Lab Equipment'
);


ALTER TYPE equipmenttypes OWNER TO postgres;

--
-- Name: mode_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE mode_type AS ENUM (
    'Inventory',
    'Disposal'
);


ALTER TYPE mode_type OWNER TO postgres;

--
-- Name: role_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE role_type AS ENUM (
    'SPMO',
    'Checker',
    'Clerk'
);


ALTER TYPE role_type OWNER TO postgres;

--
-- Name: sched_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE sched_status AS ENUM (
    'Ongoing',
    'Done',
    'Upcoming'
);


ALTER TYPE sched_status OWNER TO postgres;

--
-- Name: statustypes; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE statustypes AS ENUM (
    'Found',
    'Not Found'
);


ALTER TYPE statustypes OWNER TO postgres;

--
-- Name: auto_ins_working(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION auto_ins_working() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   INSERT INTO working_equipment(qrcode, status) values (NEW.qrcode, 'Found');
   return NEW;
END
$$;


ALTER FUNCTION public.auto_ins_working() OWNER TO postgres;

--
-- Name: auto_insert_clerk_roles(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION auto_insert_clerk_roles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
   BEGIN
   IF NEW.role = 'Clerk'
   THEN
INSERT INTO clerk VALUES (NEW.staff_id, NEW.office_id);
   END IF;
   RETURN NEW;
END
$$;


ALTER FUNCTION public.auto_insert_clerk_roles() OWNER TO postgres;

--
-- Name: check_insert_assigned_to(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION check_insert_assigned_to() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
   BEGIN
   IF (SELECT office_id from staff where office_id = NEW.office_id_holder and staff_id = NEW.staff_id) is NULL
   THEN
	RAISE EXCEPTION 'The staff and office doesnt match!';
   END IF;
   RETURN NEW;
END
$$;


ALTER FUNCTION public.check_insert_assigned_to() OWNER TO postgres;

--
-- Name: check_insert_inventory_details(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION check_insert_inventory_details() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
   BEGIN
   IF ((SELECT title from schedule where id = NEW.inventory_id) != 'Inventory')
   THEN
RAISE EXCEPTION 'Schedule specified is not an Inventory';
   END IF;
   RETURN NEW;
END
$$;


ALTER FUNCTION public.check_insert_inventory_details() OWNER TO postgres;

--
-- Name: copy_equip(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION copy_equip() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
  begin
insert into dummy_inventory(equipment_qrcode) select qrcode from equipment;
return true;
  end;
$$;


ALTER FUNCTION public.copy_equip() OWNER TO postgres;

--
-- Name: encryptqr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION encryptqr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
   BEGIN 
   IF NEW.component_no is NULL
   THEN
   	NEW.qrcode := md5(NEW.property_no::text);
   ELSE 
	NEW.qrcode := md5((NEW.property_no::text || NEW.component_no::text)::text);
   END IF;
   return NEW;
END
$$;


ALTER FUNCTION public.encryptqr() OWNER TO postgres;

--
-- Name: new_assignment(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION new_assignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
UPDATE equipment_history set end_date = NEW.date_assigned where equip_qrcode=NEW.equipment_qr_code and end_date is null;

INSERT INTO equipment_history (equip_qrcode,start_date,staff_id,office_id) values(NEW.equipment_qr_code,NEW.date_assigned,NEW.staff_id,NEW.office_id_holder);

RETURN NEW;

END
$$;


ALTER FUNCTION public.new_assignment() OWNER TO postgres;

--
-- Name: new_equip_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION new_equip_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
IF(TG_OP = 'INSERT') THEN
INSERT INTO transaction_log (staff_id,transaction_details,equip_qrcode) values ('sbmagdadaro','added an equipment',NEW.qrcode);
RETURN NEW;
ELSEIF(TG_OP = 'UPDATE') THEN
INSERT INTO transaction_log (staff_id,transaction_details,equip_qrcode) values ('sbmagdadaro','updated an equipment',NEW.qrcode);
RETURN NEW;
ELSEIF(TG_OP = 'DELETE') THEN
INSERT INTO transaction_log (staff_id,transaction_details) values ('sbmagdadaro','discarded an equipment');
RETURN NEW;
END IF;
RETURN NULL;
END
$$;


ALTER FUNCTION public.new_equip_transaction() OWNER TO postgres;

--
-- Name: new_sched_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION new_sched_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
IF(TG_OP = 'INSERT') THEN
INSERT INTO transaction_log (staff_id,transaction_details) values ('sbmagdadaro','created a schedule');
RETURN NEW;
ELSEIF(TG_OP = 'UPDATE') THEN
INSERT INTO transaction_log (staff_id,transaction_details) values ('sbmagdadaro','updated a schedule');
RETURN NEW;
ELSEIF(TG_OP = 'DELETE') THEN
INSERT INTO transaction_log (staff_id,transaction_details) values ('sbmagdadaro','removed a schedule');
RETURN NEW;
END IF;
RETURN NULL;
END
$$;


ALTER FUNCTION public.new_sched_transaction() OWNER TO postgres;

--
-- Name: reset_equip_stat(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION reset_equip_stat() RETURNS void
    LANGUAGE plpgsql
    AS $$
 BEGIN
EXECUTE 'UPDATE working_equipment set status=' || quote_literal('Not Found');
 END
$$;


ALTER FUNCTION public.reset_equip_stat() OWNER TO postgres;

--
-- Name: update_sched(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION update_sched() RETURNS void
    LANGUAGE plpgsql
    AS $$
 BEGIN
EXECUTE 'UPDATE schedule SET event_status = ' || quote_literal('Ongoing') || ' WHERE event_status=' || quote_literal('Upcoming') || ' AND now() >= schedule.start AND now() <= schedule.end';
EXECUTE 'UPDATE schedule SET event_status = ' || quote_literal('Done') || ' WHERE event_status=' || quote_literal('Ongoing') || ' AND now() > schedule.end';
 END
$$;


ALTER FUNCTION public.update_sched() OWNER TO postgres;

--
-- Name: valid_start(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION valid_start() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
 BEGIN
IF NEW.start <= CURRENT_DATE
THEN
RAISE EXCEPTION 'Starting Date should be at least tomorrow.';
RETURN NULL;
END IF;
RETURN NEW;
 END
$$;


ALTER FUNCTION public.valid_start() OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: assigned_to; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE assigned_to (
    equipment_qr_code text NOT NULL,
    office_id_holder integer NOT NULL,
    date_assigned date NOT NULL,
    staff_id text NOT NULL,
    CONSTRAINT validassignmentdate CHECK ((date_assigned <= ('now'::text)::date))
);


ALTER TABLE assigned_to OWNER TO postgres;

--
-- Name: checker; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE checker (
    username text NOT NULL,
    password text NOT NULL,
    type equipmenttypes NOT NULL,
    md5 text NOT NULL,
    email character varying(254) NOT NULL
);


ALTER TABLE checker OWNER TO postgres;

--
-- Name: clerk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE clerk (
    username text NOT NULL,
    designated_office integer NOT NULL
);


ALTER TABLE clerk OWNER TO postgres;

--
-- Name: mobile_trans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE mobile_trans (
    id integer NOT NULL,
    username character varying(30) NOT NULL,
    transaction character varying(100) NOT NULL,
    parameter text,
    result text,
    remarks character varying(30) NOT NULL,
    "time" timestamp without time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE mobile_trans OWNER TO postgres;

--
-- Name: dates; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW dates AS
 SELECT mobile_trans."time",
    date_part('month'::text, date(mobile_trans."time")) AS month,
    date_part('day'::text, date(mobile_trans."time")) AS day,
    date_part('year'::text, date(mobile_trans."time")) AS year,
    mobile_trans.parameter
   FROM mobile_trans;


ALTER TABLE dates OWNER TO postgres;

--
-- Name: office; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE office (
    office_id integer NOT NULL,
    email character varying(254) NOT NULL,
    password text NOT NULL,
    office_name text NOT NULL,
    cluster_name clusters,
    md5 text NOT NULL,
    short_office_name text NOT NULL
);


ALTER TABLE office OWNER TO postgres;

--
-- Name: extract_office_trans; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW extract_office_trans AS
 SELECT DISTINCT mobile_trans.id,
    mobile_trans.username,
    office.office_name,
    mobile_trans.parameter,
    dates.month,
    dates.day,
    dates.year
   FROM office,
    mobile_trans,
    assigned_to,
    dates
  WHERE (((mobile_trans.transaction)::text = 'Disposal Request'::text) AND (mobile_trans.parameter = assigned_to.equipment_qr_code) AND (assigned_to.office_id_holder = office.office_id));


ALTER TABLE extract_office_trans OWNER TO postgres;

--
-- Name: dis_count; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW dis_count AS
 SELECT DISTINCT extract_office_trans.office_name,
    count(extract_office_trans.id) AS count
   FROM extract_office_trans,
    office,
    assigned_to
  WHERE ((extract_office_trans.parameter = assigned_to.equipment_qr_code) AND (assigned_to.office_id_holder = office.office_id) AND (office.office_name = extract_office_trans.office_name))
  GROUP BY extract_office_trans.office_name;


ALTER TABLE dis_count OWNER TO postgres;

--
-- Name: disposal_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE disposal_requests (
    id integer NOT NULL,
    username text NOT NULL,
    type equipmenttypes NOT NULL,
    office_name text,
    content text
);


ALTER TABLE disposal_requests OWNER TO postgres;

--
-- Name: disposal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE disposal_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE disposal_requests_id_seq OWNER TO postgres;

--
-- Name: disposal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE disposal_requests_id_seq OWNED BY disposal_requests.id;


--
-- Name: disposed_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE disposed_equipment (
    qrcode text NOT NULL,
    appraised_value integer,
    way_of_disposal disposaltypes NOT NULL,
    or_no text,
    amount integer,
    "time" timestamp without time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE disposed_equipment OWNER TO postgres;

--
-- Name: dummy_transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE dummy_transaction (
    trans_num integer NOT NULL,
    category text,
    "time" timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    read boolean DEFAULT false
);


ALTER TABLE dummy_transaction OWNER TO postgres;

--
-- Name: dummy_transaction_trans_num_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE dummy_transaction_trans_num_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dummy_transaction_trans_num_seq OWNER TO postgres;

--
-- Name: dummy_transaction_trans_num_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE dummy_transaction_trans_num_seq OWNED BY dummy_transaction.trans_num;


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE equipment (
    qrcode text NOT NULL,
    article_name text NOT NULL,
    property_no numeric(4,0) NOT NULL,
    component_no integer,
    date_acquired date NOT NULL,
    description text,
    unit_cost integer NOT NULL,
    type equipmenttypes NOT NULL,
    condition condition_type NOT NULL,
    image_file character varying NOT NULL,
    CONSTRAINT validdateacquired CHECK ((date_acquired < ('now'::text)::date))
);


ALTER TABLE equipment OWNER TO postgres;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE staff (
    office_id integer NOT NULL,
    staff_id text NOT NULL,
    first_name text NOT NULL,
    middle_init character(1),
    last_name text NOT NULL,
    role role_type
);


ALTER TABLE staff OWNER TO postgres;

--
-- Name: equipment_date_extracted_office_staff; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW equipment_date_extracted_office_staff AS
 SELECT equipment.qrcode,
    equipment.article_name,
    equipment.property_no,
    equipment.component_no,
    ( SELECT date_part('year'::text, equipment.date_acquired) AS year) AS year,
    ( SELECT date_part('month'::text, equipment.date_acquired) AS month) AS month,
    ( SELECT date_part('day'::text, equipment.date_acquired) AS day) AS day,
    equipment.description,
    equipment.unit_cost,
    equipment.type,
    equipment.condition,
    office.office_id,
    office.office_name,
    staff.staff_id,
    staff.first_name,
    staff.middle_init,
    staff.last_name,
    equipment.image_file
   FROM equipment,
    office,
    assigned_to,
    staff
  WHERE ((equipment.qrcode = assigned_to.equipment_qr_code) AND (assigned_to.office_id_holder = office.office_id) AND (staff.staff_id = assigned_to.staff_id));


ALTER TABLE equipment_date_extracted_office_staff OWNER TO postgres;

--
-- Name: eq_count; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW eq_count AS
 SELECT equipment_date_extracted_office_staff.article_name,
    equipment_date_extracted_office_staff.property_no,
    equipment_date_extracted_office_staff.office_name,
    count(equipment_date_extracted_office_staff.component_no) AS no_of_eq
   FROM equipment_date_extracted_office_staff
  GROUP BY equipment_date_extracted_office_staff.article_name, equipment_date_extracted_office_staff.property_no, equipment_date_extracted_office_staff.office_name;


ALTER TABLE eq_count OWNER TO postgres;

--
-- Name: equipment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE equipment_history (
    record_no integer NOT NULL,
    equip_qrcode text NOT NULL,
    start_date date DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_date date,
    staff_id text NOT NULL,
    office_id integer NOT NULL,
    CONSTRAINT valid_dates CHECK ((end_date >= start_date)),
    CONSTRAINT valid_edate CHECK ((end_date <= ('now'::text)::date)),
    CONSTRAINT valid_sdate CHECK ((start_date <= ('now'::text)::date))
);


ALTER TABLE equipment_history OWNER TO postgres;

--
-- Name: equipment_history_record_no_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE equipment_history_record_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE equipment_history_record_no_seq OWNER TO postgres;

--
-- Name: equipment_history_record_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE equipment_history_record_no_seq OWNED BY equipment_history.record_no;


--
-- Name: inventory_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE inventory_details (
    inventory_id integer NOT NULL,
    initiated_by character varying NOT NULL
);


ALTER TABLE inventory_details OWNER TO postgres;

--
-- Name: mobile_trans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE mobile_trans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE mobile_trans_id_seq OWNER TO postgres;

--
-- Name: mobile_trans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE mobile_trans_id_seq OWNED BY mobile_trans.id;


--
-- Name: office_office_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE office_office_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE office_office_id_seq OWNER TO postgres;

--
-- Name: office_office_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE office_office_id_seq OWNED BY office.office_id;


--
-- Name: schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE schedule (
    id integer NOT NULL,
    title mode_type NOT NULL,
    start date NOT NULL,
    "end" date NOT NULL,
    event_status sched_status DEFAULT 'Upcoming'::sched_status,
    CONSTRAINT validenddate CHECK ((("end" >= ('now'::text)::date) AND ("end" >= start))),
    CONSTRAINT validstartdate CHECK ((start >= ('now'::text)::date))
);


ALTER TABLE schedule OWNER TO postgres;

--
-- Name: sched_simple; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW sched_simple AS
 SELECT schedule.id,
    schedule.start,
    ( SELECT date_part('year'::text, schedule.start) AS start_year) AS start_year,
    ( SELECT date_part('month'::text, schedule.start) AS start_month) AS start_month,
    ( SELECT date_part('day'::text, schedule.start) AS start_day) AS start_day,
    ( SELECT date_part('year'::text, schedule."end") AS end_year) AS end_year,
    ( SELECT date_part('month'::text, schedule."end") AS end_month) AS end_month,
    ( SELECT date_part('day'::text, schedule."end") AS end_day) AS end_day
   FROM schedule;


ALTER TABLE sched_simple OWNER TO postgres;

--
-- Name: schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE schedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE schedule_id_seq OWNER TO postgres;

--
-- Name: schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE schedule_id_seq OWNED BY schedule.id;


--
-- Name: spmo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE spmo (
    username text NOT NULL,
    password text NOT NULL,
    email character varying(254),
    md5 text NOT NULL
);


ALTER TABLE spmo OWNER TO postgres;

--
-- Name: spmo_staff_assignment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE spmo_staff_assignment (
    inventory_id integer NOT NULL,
    inventory_office integer NOT NULL,
    spmo_assigned character varying NOT NULL
);


ALTER TABLE spmo_staff_assignment OWNER TO postgres;

--
-- Name: transaction_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE transaction_log (
    transaction_no integer NOT NULL,
    staff_id text NOT NULL,
    transaction_date date DEFAULT now() NOT NULL,
    transaction_time time without time zone DEFAULT now() NOT NULL,
    transaction_details text NOT NULL,
    equip_qrcode text,
    CONSTRAINT validtransactiondate CHECK ((transaction_date <= ('now'::text)::date))
);


ALTER TABLE transaction_log OWNER TO postgres;

--
-- Name: transaction_log_transaction_no_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE transaction_log_transaction_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE transaction_log_transaction_no_seq OWNER TO postgres;

--
-- Name: transaction_log_transaction_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE transaction_log_transaction_no_seq OWNED BY transaction_log.transaction_no;


--
-- Name: working_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE working_equipment (
    qrcode text NOT NULL,
    date_last_inventoried date,
    status statustypes NOT NULL,
    CONSTRAINT validdateinventory CHECK ((date_last_inventoried < ('now'::text)::date))
);


ALTER TABLE working_equipment OWNER TO postgres;

--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY disposal_requests ALTER COLUMN id SET DEFAULT nextval('disposal_requests_id_seq'::regclass);


--
-- Name: trans_num; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY dummy_transaction ALTER COLUMN trans_num SET DEFAULT nextval('dummy_transaction_trans_num_seq'::regclass);


--
-- Name: record_no; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY equipment_history ALTER COLUMN record_no SET DEFAULT nextval('equipment_history_record_no_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY mobile_trans ALTER COLUMN id SET DEFAULT nextval('mobile_trans_id_seq'::regclass);


--
-- Name: office_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY office ALTER COLUMN office_id SET DEFAULT nextval('office_office_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY schedule ALTER COLUMN id SET DEFAULT nextval('schedule_id_seq'::regclass);


--
-- Name: transaction_no; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY transaction_log ALTER COLUMN transaction_no SET DEFAULT nextval('transaction_log_transaction_no_seq'::regclass);


--
-- Data for Name: assigned_to; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY assigned_to (equipment_qr_code, office_id_holder, date_assigned, staff_id) FROM stdin;
790d67b8e374ac145b107e84b846ebd5	44	2016-11-14	rrroxas
b7e3524361c9f4681818d388431beeac	44	2016-11-14	rrroxas
1afb6bd07195e9f753b0d55805b5a246	44	2016-11-14	rrroxas
1a54ed0d8ca0bdb0cf54794977feb05a	44	2016-11-14	rrroxas
969d53a568dfbaf6bb929d69917b34fa	29	2016-07-20	mcpedrano
67107e5f6f1efb4409c37abd1645b0f5	29	2016-07-20	mcpedrano
8c433a09bd26b943147c4d9bacb15efc	29	2016-07-20	mcpedrano
d348734a9ee240ebc4c0937a6e755621	29	2016-07-20	mcpedrano
02fd6cf9553be2d58efe687b857830f6	29	2016-07-20	mcpedrano
a127c5a2ed0a7a7790327f59706b0b77	29	2016-07-20	mcpedrano
f752167fca2ecaf38964ffaff639b8d8	29	2016-07-20	mcpedrano
69c4bb19e942fea086d5fd85078695a0	29	2016-07-20	mcpedrano
f4d9387dec63ae41d4b40a146e759a72	28	2016-11-20	fcabad
4942d5cf1f14e94afa9aaf45dee2b9db	28	2016-11-20	fcabad
df4fb1d4cc775da225d5c5e70143e44d	28	2016-11-20	fcabad
42ec8f73f8d06c8cbe768098a3103ab3	28	2016-11-20	fcabad
1df728af01ada2c39964d0657159801f	28	2016-11-20	fcabad
98b2a70939d90bf9722d84bc4f97bb47	28	2016-11-20	fcabad
620d7bfbd5e59107057824ca9dbaf6b8	28	2016-11-20	fcabad
9b9f95bf74798c23c71e69445d2c53d3	22	2016-11-20	rmdulaca
6a14a740d22dc687d749167c3325d776	44	2016-11-24	rrroxas
24cceab7ffc1118f5daaace13c670885	23	2016-11-09	hbespiritu
983c25c7ee9644953077c7f3cb15a8db	23	2016-11-09	hbespiritu
7f7959e1567f278cff8c64602c15f494	29	2016-11-17	mcpedrano
e67981d241ad5e29f4420a6f4ef2b7cb	29	2016-11-17	mcpedrano
70c8f994a37f42dc783d951ffaa80ef8	29	2016-11-17	mcpedrano
654784daf0b133e42d02214b22cb03a6	29	2016-11-17	mcpedrano
38be5418a8e2601443030c8cba989324	29	2016-11-17	mcpedrano
af78d2a38e4953c40fe70c54195c83b3	29	2016-11-17	mcpedrano
7813d1590d28a7dd372ad54b5d29d033	22	2016-11-28	rmdulaca
ef58f7ffe086514aa0164c7fc4f6cea8	14	2016-11-28	mjmatero
56775887921d4847aff58167bcdc1150	44	2016-11-28	rrroxas
dbc4d84bfcfe2284ba11beffb853a8c4	44	2016-11-28	rrroxas
\.


--
-- Data for Name: checker; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY checker (username, password, type, md5, email) FROM stdin;
fmaglangit	$1$VKOMr8Mo$WgbBwh96jC7Mp5HTXuskL.	Lab Equipment	81dc9bdb52d04dc20036dbd8313ed055	famaglangit@up.edu.ph
rbasadre	$1$YMZpSL8l$y5wQgnPI68sSvEmla34v6.	Furnitures and Fixtures	040b7cf4a55014e185813e0644502ea9	rbbasadre@up.edu.ph
prallos	$1$xPTVK/Lh$0uDrfmtr5Nuo.O4vzM7Zf/	Non-IT Equipment	a152e841783914146e4bcd4f39100686	pcrallos@up.edu.ph
fladay	$1$/FcYYjRP$7dZa6KA0FmCriGN0H1sDW1	IT Equipments	c83b2d5bb1fb4d93d9d064593ed6eea2	fldaday@up.edu.ph
\.


--
-- Data for Name: clerk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY clerk (username, designated_office) FROM stdin;
jklepiten	1
mnmacasil	4
pptudtud	6
mjmatero	14
tgtan	15
abbascon	16
rcbinagatan	17
yrorillo	18
vmsesaldo	20
rrroxas	44
rmdulaca	22
hbespiritu	23
lsdee	25
eobensig	27
rpbayawa	26
jegumalal	60
fcabad	28
mcpedrano	29
bfespiritu	6
demontera	6
jcpinzon	6
rrfernandez	6
lgpilapil	16
\.


--
-- Data for Name: disposal_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY disposal_requests (id, username, type, office_name, content) FROM stdin;
\.


--
-- Name: disposal_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('disposal_requests_id_seq', 1, false);


--
-- Data for Name: disposed_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY disposed_equipment (qrcode, appraised_value, way_of_disposal, or_no, amount, "time") FROM stdin;
f4d9387dec63ae41d4b40a146e759a72	100	Destruction	\N	\N	2016-11-25 09:33:07.752934
1df728af01ada2c39964d0657159801f	100	Destruction	\N	\N	2016-11-25 09:33:07.856015
56775887921d4847aff58167bcdc1150	1000	Destruction	\N	\N	2016-11-28 02:17:54.25314
6a14a740d22dc687d749167c3325d776	2000	Transfer	\N	\N	2016-11-28 03:08:30.85263
24cceab7ffc1118f5daaace13c670885	2000	Destruction	\N	\N	2016-11-28 05:16:39.203249
1afb6bd07195e9f753b0d55805b5a246	800	Sale	2947520	800	2016-11-28 05:22:44.283774
1a54ed0d8ca0bdb0cf54794977feb05a	1000	Destruction	\N	\N	2016-11-28 05:32:13.566183
42ec8f73f8d06c8cbe768098a3103ab3	30	Destruction	\N	\N	2016-11-28 05:37:19.739406
b7e3524361c9f4681818d388431beeac	800	Destruction	\N	\N	2016-11-28 05:44:27.059909
790d67b8e374ac145b107e84b846ebd5	800	Destruction	\N	\N	2016-11-28 05:52:18.929275
d348734a9ee240ebc4c0937a6e755621	10000	Destruction	\N	\N	2016-11-28 05:55:13.698216
8c433a09bd26b943147c4d9bacb15efc	10000	Destruction	\N	\N	2016-11-28 05:56:37.005495
654784daf0b133e42d02214b22cb03a6	500	Transfer	\N	\N	2016-11-28 05:59:22.522088
\.


--
-- Data for Name: dummy_transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY dummy_transaction (trans_num, category, "time", read) FROM stdin;
1	1 New Disposal Request	2016-11-10 15:49:11.978728	f
2	1 New Disposal Request	2016-11-10 15:49:11.978728	f
3	1 New Disposal Request	2016-11-14 05:48:08.894157	f
\.


--
-- Name: dummy_transaction_trans_num_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('dummy_transaction_trans_num_seq', 3, true);


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY equipment (qrcode, article_name, property_no, component_no, date_acquired, description, unit_cost, type, condition, image_file) FROM stdin;
969d53a568dfbaf6bb929d69917b34fa	Aircon	4096	1	2016-07-20	Carrier	20000	Aircons	Working	IMG20161122164342.jpg
67107e5f6f1efb4409c37abd1645b0f5	Aircon	4096	2	2016-07-20	Carrier	20000	Aircons	Working	IMG20161122164342.jpg
02fd6cf9553be2d58efe687b857830f6	Aircon	4096	5	2016-07-20	Carrier	20000	Aircons	Working	IMG20161122164342.jpg
a127c5a2ed0a7a7790327f59706b0b77	Aircon	4096	6	2016-07-20	Carrier	20000	Aircons	Working	IMG20161122164342.jpg
f752167fca2ecaf38964ffaff639b8d8	Aircon	4096	7	2016-07-20	Carrier	20000	Aircons	Working	IMG20161122164342.jpg
69c4bb19e942fea086d5fd85078695a0	Aircon	4096	8	2016-07-20	Carrier	20000	Aircons	Working	IMG20161122164342.jpg
9b9f95bf74798c23c71e69445d2c53d3	Chair	3859	1	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Working	IMG20161122164331.jpg
4942d5cf1f14e94afa9aaf45dee2b9db	Chair	3859	3	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Working	IMG20161122164331.jpg
df4fb1d4cc775da225d5c5e70143e44d	Chair	3859	4	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Working	IMG20161122164331.jpg
42ec8f73f8d06c8cbe768098a3103ab3	Chair	3859	5	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Disposed	IMG20161122164331.jpg
98b2a70939d90bf9722d84bc4f97bb47	Chair	3859	7	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Working	IMG20161122164331.jpg
ef58f7ffe086514aa0164c7fc4f6cea8	Chair	3859	8	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Working	IMG20161122164331.jpg
620d7bfbd5e59107057824ca9dbaf6b8	Chair	3859	9	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Working	IMG20161122164331.jpg
f4d9387dec63ae41d4b40a146e759a72	Chair	3859	2	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Disposed	IMG20161122164331.jpg
1df728af01ada2c39964d0657159801f	Chair	3859	6	2016-11-20	Monoblock Chair, Brown	100	Furnitures and Fixtures	Disposed	IMG20161122164331.jpg
56775887921d4847aff58167bcdc1150	Projector	8888	1	2016-11-24	Acer, Black	3000	IT Equipments	Disposed	IMG20161122164351.jpg
6a14a740d22dc687d749167c3325d776	Projector	8888	2	2016-11-24	Acer, Black	3000	IT Equipments	Disposed	IMG20161122164351.jpg
7f7959e1567f278cff8c64602c15f494	Swivel Chair	2048	1	2016-11-17	Gray	1000	Furnitures and Fixtures	Working	IMG20161122165134.jpg
e67981d241ad5e29f4420a6f4ef2b7cb	Swivel Chair	2048	2	2016-11-17	Gray	1000	Furnitures and Fixtures	Working	IMG20161122165134.jpg
70c8f994a37f42dc783d951ffaa80ef8	Swivel Chair	2048	3	2016-11-17	Gray	1000	Furnitures and Fixtures	Working	IMG20161122165134.jpg
38be5418a8e2601443030c8cba989324	Swivel Chair	2048	5	2016-11-17	Gray	1000	Furnitures and Fixtures	Working	IMG20161122165134.jpg
af78d2a38e4953c40fe70c54195c83b3	Swivel Chair	2048	6	2016-11-17	Gray	1000	Furnitures and Fixtures	Working	IMG20161122165134.jpg
24cceab7ffc1118f5daaace13c670885	Bulletin Board	1084	1	2016-11-09	With Glass Cover	3000	Furnitures and Fixtures	Disposed	IMG20161122164802.jpg
983c25c7ee9644953077c7f3cb15a8db	Bulletin Board	1084	2	2016-11-09	With Glass Cover	3000	Furnitures and Fixtures	Working	IMG20161122164802.jpg
b7e3524361c9f4681818d388431beeac	Fire Extinguisher	4937	2	2016-11-14	Red	1000	Non-IT Equipment	Disposed	IMG20161122164854.jpg
790d67b8e374ac145b107e84b846ebd5	Fire Extinguisher	4937	1	2016-11-14	Red	1000	Non-IT Equipment	Disposed	IMG20161122164854.jpg
d348734a9ee240ebc4c0937a6e755621	Aircon	4096	4	2016-07-20	Carrier	20000	Aircons	Disposed	IMG20161122164342.jpg
8c433a09bd26b943147c4d9bacb15efc	Aircon	4096	3	2016-07-20	Carrier	20000	Aircons	Disposed	IMG20161122164342.jpg
1afb6bd07195e9f753b0d55805b5a246	Fire Extinguisher	4937	3	2016-11-14	Red	1000	Non-IT Equipment	Disposed	IMG20161122164854.jpg
1a54ed0d8ca0bdb0cf54794977feb05a	Fire Extinguisher	4937	4	2016-11-14	Red	1000	Non-IT Equipment	Disposed	IMG20161122164854.jpg
654784daf0b133e42d02214b22cb03a6	Swivel Chair	2048	4	2016-11-17	Gray	1000	Furnitures and Fixtures	Disposed	IMG20161122165134.jpg
7813d1590d28a7dd372ad54b5d29d033	Fan	6969	\N	2016-11-27	fast	1200	Furnitures and Fixtures	Working	IMG20161122164331.jpg
dbc4d84bfcfe2284ba11beffb853a8c4	Fax Machine	4444	\N	2016-11-16	Laser Fax with built-in handset.	9850	Non-IT Equipment	Working	brother-fax-2840-laser-fax-machine-with-print-and-copy-capabilities-9468-7155615-1f7ded4c526ac96027df61c255f45bc1-catalog_233.jpg
\.


--
-- Data for Name: equipment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY equipment_history (record_no, equip_qrcode, start_date, end_date, staff_id, office_id) FROM stdin;
1	7813d1590d28a7dd372ad54b5d29d033	2016-11-27	2016-11-27	rmdulaca	22
2	7813d1590d28a7dd372ad54b5d29d033	2016-11-27	2016-11-28	rrroxas	44
3	7813d1590d28a7dd372ad54b5d29d033	2016-11-28	\N	rmdulaca	22
4	ef58f7ffe086514aa0164c7fc4f6cea8	2016-11-28	\N	mjmatero	14
6	56775887921d4847aff58167bcdc1150	2016-11-28	\N	rrroxas	44
5	dbc4d84bfcfe2284ba11beffb853a8c4	2016-11-16	2016-11-28	rcbinagatan	17
7	dbc4d84bfcfe2284ba11beffb853a8c4	2016-11-28	\N	rrroxas	44
\.


--
-- Name: equipment_history_record_no_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('equipment_history_record_no_seq', 7, true);


--
-- Data for Name: inventory_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY inventory_details (inventory_id, initiated_by) FROM stdin;
4	sbmagdadaro
\.


--
-- Data for Name: mobile_trans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY mobile_trans (id, username, transaction, parameter, result, remarks, "time") FROM stdin;
1	mccamantang	Get Equipment Details	269efc0384256ed26a4f1bc2c6d72758	1	Success	2016-11-25 08:41:48.763416
2	rrroxas	Disposal Request	dbc4d84bfcfe2284ba11beffb853a8c4	1	Success	2016-11-28 09:24:53.524918
\.


--
-- Name: mobile_trans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('mobile_trans_id_seq', 2, true);


--
-- Data for Name: office; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY office (office_id, email, password, office_name, cluster_name, md5, short_office_name) FROM stdin;
4	upcebuartsandculture@up.edu.ph	$1$jCvohuMJ$OXtI8aiLNol0gVAS8iT8R/	Arts and Culture	Arts and Humanities	3a3105e049caed5c168d6bcc0b1f5038	Arts and Culture
14	upcebubudgetoffice@up.edu.ph	$1$p2vDGCkQ$rBWkWUudfJE8Pjw396tOf0	Budget Office	Administration	278dc9afd33a2f4b156064721bcbc94c	Budget Office
15	upcebubmc@up.edu.ph	$1$Jzaz9fKR$6LJYeOv5NvfGWkjbUQ8.U/	Business Management Cluster	Management	9589bfb537acab198074e720b60dcdda	Management Cluster
22	upcebudorm@up.edu.ph	$1$pDN6yZ2Z$Thz.v3Sev6gecRUx2Y2Cc0	Dormitory	Administration	5c7184cbc8199da473d7b4ef4f2865b2	Dormitory
26	upcebuhrdo@up.edu.ph	$1$TQ7kd/A5$DKTXnDYKmJn4IN45cNnve0	Human Resource and Development Office	Administration	8f280deac20abff1c000f69d49641c73	HRDO
27	upcebuitso@up.edu.ph	$1$A9vq9XZi$UoLCYdDyNgTfIyWZdwu6R0	Innovation Technology Support Office	Administration	bdcfaf9e08910498159204aa7a88d5f9	ITSO
28	upcebulegaloffice@up.edu.ph	$1$Vo39f1qZ$pCM/pFl57uCrpmuhndBY60	Legal Office	Administration	9345b4e983973212313e4c809b94f75d	Legal Office
29	upcebulibrary@up.edu.ph	$1$.NjbyoWE$VufZNetxZpNOjNxq0KEu31	Library	Administration	2ea7fe2bd051ec076a226b7dab76aaa3	Library
30	upcebunstp@up.edu.ph	$1$KNENw4wL$cbb1hrkuZvJEL8ilG2nq71	National Service Training Program	Social Sciences	81ad67bdedd7367dbce7cda841584ee8	NSTP Office
31	upcebuoash@up.edu.ph	$1$MIV6egu.$e6SIn9cPgqMUq95Z.ccDT1	Office of Anti-Sexual Harassment	Administration	029c69acc26d71b938f615bf44ccf21a	OASH
32	upcebuocep@up.edu.ph	$1$xxT3SehW$0e8AAi0bL16V/L1hGAw2H.	Office of Continuing Education and Pahinungod	Administration	43e58212cc7a767fe98d5c68d609994b	OCEP
33	upcebuoca@up.edu.ph	$1$5LWekrg5$CUBxTKhWw5g.ZgNT2k3aD0	Office of the Campus Architect	Administration	efe79c321127e9bcc1ad7f6956d52ca6	OCA
34	upcebuoil@up.edu.ph	$1$1KpKGZae$2GImzqhK8vtu8YzOW6haK1	Office of the International Linkages	Administration	f6a08b944f7078520423ad9f699def40	OIL
35	upcebuosa@up.edu.ph	$1$G2/wKz9F$AlMjY8lfEnYNxPZ/RHyXU.	Office of the Student Affairs	Administration	abe54cc8d0711f64236c9baed23d858c	OSA
36	upcebuocsr@up.edu.ph	$1$z507vTkn$/dIq9WVynRYSDn9pehi77.	Office of the College Secretary and Registrar	Administration	5940569cd1d60781f856f93235b072ee	OCSR
37	upcebupah@up.edu.ph	$1$Bw2yy8.p$IKx4ySPwIAEK85qHUcQ2b1	Performing Arts Hall	Arts and Humanities	b6dbf9d2bc82d946d2171bba213b6b5f	PAH
38	upcebupio@up.edu.ph	$1$IO97xt9q$.pgQWu1D6oNANZdtN0L3/1	Public Information Office	Administration	ebcd6ca0b6321d6bb944a04648c0333c	PIO
5	upcebuahcluster@up.edu.ph	$1$RdNqy1xR$kmaAWcLfc5fZ53GhzQuBx/	Arts and Humanities Cluster	Arts and Humanities	b6be3428bf00819ccf5b32ddfc92fdef	AH Cluster
39	upcebusciences@up.edu.ph	$1$b8AeyZuE$LcJ3tZkZDoKr5z1HIQ9qK0	Sciences Cluster	Sciences	d1c176de45c578b9c0a1b50bdf99df26	Sciences Cluster
1	upcebuaccounting@up.edu.ph	$1$SHurXg5a$SgFIRTP7EeFixQliVWtcq0	Accounting Office	Administration	9726255eec083aa56dc0449a21b33190	Arts and Culture
2	upcebuallworkers@up.edu.ph	$1$qvETVpWl$h29n1D9OWi/Lj999HT6RK1	All UP Workers Union	Administration	a06be211ee1b949b0dc8cef92a4373a9	All UP WU
3	upcebualumniaffairs@up.edu.ph	$1$StSLVexA$q9dzN/SCrPD9BAy/0sAJp/	Alumni Office	Administration	9855f5cdff0306ae33a49f89e087ccbc	Alumni Office
6	upcebuahclusterfa@up.edu.ph	$1$ARSyzavg$/UkVdq4HJZ/UXSjzpoa7s/	Arts and Humanities Cluster - Fine Arts	Arts and Humanities	b6be3428bf00819ccf5b32ddfc92fdef	Fine Arts Dept.
7	upcebuminigallery@up.edu.ph	$1$NlMWptA4$Mvr/elcfbbwEtvvzWHG1Q/	Arts and Humanities Cluster - Mini Gallery	Arts and Humanities	7abcee9bc5052d5567af5162c475c32b	Mini Gallery
8	upcebuahclustermc@up.edu.ph	$1$kW4HayYP$5nnaGAIVB5tIUQ6N8DdpD.	Arts and Humanities Cluster - Mass Communication	Arts and Humanities	b6be3428bf00819ccf5b32ddfc92fdef	Mass Comm Dept.
9	upcebuadaa@up.edu.ph	$1$Wnjw7MtX$R7NBhcif/y8slaLAslda71	Associate Dean for Academic Affairs	Administration	c9c486b04879da93ffdc9989fa91d48a	ADAA
10	upcebuada@up.edu.ph	$1$fuFcEiAr$z4kRKDJ3VXd78D8qPGkpS/	Associate Dean for Administration	Administration	e52e7ce4ac2458867d05eaad577560db	ADAA
11	upcebuavr1@up.edu.ph	$1$MXU.UZjk$EbwNVf7omeakC0/YXYaim1	Audio Visual Room 1	Administration	481189a085be54668725d022a22b8c62	AVR1
12	upcebuavr2@up.edu.ph	$1$UD3wpgVL$puL1KH78Uf2aZqgr7gbPX0	Audio Visual Room 2	Administration	18615b8f292a41582d0de23c9223148d	AVR2
13	upcebubidsandawards@up.edu.ph	$1$HjpmU7f3$4ZEJVtK92bBpP8AxoSPAG1	Bids and Awards	Administration	0456eaad58d067b5a10b00b49d49b436	Bids and Awards
16	upcebucdmo@up.edu.ph	$1$heanKN.V$7uytNIlSEW0ZivhFIMUhS1	Campus Development and Maintenance Office	Administration	7354c69225a7fb103e051803d3503514	CDMO
17	upcebucashoffice@up.edu.ph	$1$ahIMe/U5$xslBvJDMnmdFbL2ODbePu.	Cash Office	Administration	f444695b98e665224743401db947cda9	Cash Office
18	upcebucvsc@up.edu.ph	$1$80T2Nf23$.0cpYa70xo07JGCXJMuHN1	Central Visayas Studies Center	Arts and Humanities	a6bcc94cb4105d93c7cd391af9532d95	CVSC
19	upcebucoa@up.edu.ph	$1$vWuJMPXg$wxao/eo81ajJCCKyfbYaJ1	Commission on Audit	Administration	51f0d23ac735a2bd56bca18645843840	COA
20	upcebucsu@up.edu.ph	$1$A83h2RS4$sEHmKvi3SRpEiaCw3A7/y0	Computing Services Unit	Administration	c4f3b745b1780458f9fd3c27b49cd24b	CSU
21	upcebudean@up.edu.ph	$1$KBCuEwn8$QddJe12I7ChABZIppQtUV/	Deans Office	Administration	c467e56db62b8e21026c60cbeb20d308	Deans Office
23	upcebugad@up.edu.ph	$1$BQdQLNz/$S1DdsXyDSDSIY3sjA71Mn.	Gender and Development Office	Administration	104ffb77ee168098c6b689fe59d666d4	GAD
24	upcebugh@up.edu.ph	$1$/8um9ECW$WxPFsjPwIlamdX7.PAhEM0	Guesthouse	Administration	1bc44065d36bc88bf9b55c2a8aaa3c59	Guesthouse
25	upcebuhsu@up.edu.ph	$1$dZ.y4u1m$rkCGdPDCL4ciAIUpmpTCv0	Health Services Unit	Administration	75371e7e4287a757bf721d999f0e75d5	HSU / Clinic
40	upcebummc@up.edu.ph	$1$gZGxhdpm$8gIW86nDDvLATljVxLK9r0	Sciences Cluster - Math Department	Sciences	51434272ddcb40e9ca2e2a3ae6231fa9	Math Department
49	upcebumed@up.edu.ph	$1$PYJ5ZQei$SMkeIdT7m.B.UEjBfe5BR/	Social Sciences - Master of Education	Social Sciences	6a92cc847768907d5c1967628ff40ea4	M Ed.
50	upcebupe@up.edu.ph	$1$ZfqIYNyi$zS9spnzOJYqnbQ9Kg.aFT1	Social Sciences - P.E Department	Social Sciences	53ead7d604e6b0ca03af9db265338b43	PE Department
51	upcebuhs@up.edu.ph	$1$CfUj3n9m$XCw/3oWeLzs7qZGjjif8H0	Social Sciences - High School Department	Social Sciences	23809ff572ab8160ef781946260c3b57	High School Dept.
52	upcebuuppsyma@up.edu.ph	$1$fobrz1Q4$6UAZM/Z7HtrHlRtOUxNL40	Social Sciences - Psychology Department	Social Sciences	f105e934b96b41b8c48cb5d3a30a9cc5	Psych Dept.
53	upcebuuppss@up.edu.ph	$1$JR1WITHV$4D1mgwM5a4y6JCCU.Ix6H0	Social Sciences - Political Science Department	Social Sciences	67d1600ee0fcd7644f1141aaaf2853ea	Pol Sci Dept.
54	upcebuspmo@up.edu.ph	$1$iDkGpxj.$oplJBDV0aWZDTLZvJPSbo/	Supply and Property Management Office	Administration	7a1eabc3deb7fd02ceb1e16eafc41073	SPMO
55	upcebutlrc@up.edu.ph	$1$XMuO83ls$89mOwhRL6LJxVh9vmA8lH1	Teaching and Learning Resource Center	Administration	77306354a57dccde2214fbe3d5427c6c	TLRC
41	upcebumses@up.edu.ph	$1$GepbMeOB$MTqNnnxVi7.4yTEQSDUHR/	Sciences Cluster - Masters of Sciences in Environmental Science	Sciences	e900e40bc91d3f9f7f0a99fed68a2e96	MSES
42	upcebubio@up.edu.ph	$1$t2mPkNnA$xbRjZRhFmGF/WBSb/NDUr/	Sciences Cluster - Biology Department	Sciences	8f1c04b89761789593adc6d19f4cefad	Biology Department
43	upcebuchemlab@up.edu.ph	$1$STj.HHpJ$6AendxVuEKGwJHH.wB1LY1	Sciences Cluster - Chemistry Laboratory	Sciences	d4ac1478a4d8a4f591d35e3d75f3de65	Chem Lab
44	upcebudcs@up.edu.ph	$1$Y4HFAAkQ$M3d14xDogiIbf3jLqpWsS/	Sciences Cluster - Department of Computer Science	Sciences	4c37917ab90d78a68c113ae8f57ca070	DCS
45	upcebuphyslab@up.edu.ph	$1$kjOuwLT1$0/Ae2n/w7OmbHNRynl9.Q0	Sciences Cluster - Physics Laboratory	Sciences	370757d2df51ae456bf63c165fc71817	Physics Lab
46	upcebusecurity@up.edu.ph	$1$ejIgFlxs$T5RnZ..1VNNw1bs72QuJD.	Security Office	Administration	9371e9ae61dff55d5d6d6d050943301b	Security Office
47	upcebusnwf@up.edu.ph	$1$GUaPJ1jw$ljPXFeeMMo.erzdcabzU20	Sentro ng Wikang Filipino	Administration	a969b40f85202d86b69b1de49de10823	SWF
48	upcebusocsci@up.edu.ph	$1$VisT6vlH$IpHuY27yYoouu/sXVUZOl.	Social Sciences Cluster	Social Sciences	3b783ae84abf6f89932f84d2036da818	Soc Sci Cluster
56	upcebutbi@up.edu.ph	$1$CgGDHjsv$2rVnxSAqn8s3R35nrUNkO/	Technological Business Incubation	Sciences	4fc92a91ed496f3d76ff3b2a370c508c	TBI
57	upcebutugani@up.edu.ph	$1$xIewZ8ks$QnlSRKeDyKoO2KgfMJ5t7/	Tug-ani Office	\N	e16704d9e243b23b4f4e557748d6eef6	Tug-ani
58	upcebuusc@up.edu.ph	$1$yb0cPZzr$gDOhW3yiwAiBZXmrwjkvG0	University Student Council	\N	81ad67bdedd7367dbce7cda841584ee8	University Student Council
59	upcebusrp@up.edu.ph	$1$p50RDcxz$Ey83wZrhFB8VGAwF8KaK6/	UP Professionals School SRP	Administration	714a2e07b69985b76d21439c63679eb6	UP SRP
60	upcebuilc@up.edu.ph	$1$yfRUPg7i$GzwIVZl2DloG25klPPRJw1	Interactive Learning Center	Administration	25a9ac406aceb47a0c6cade972bc26fa	ILC
\.


--
-- Name: office_office_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('office_office_id_seq', 61, true);


--
-- Data for Name: schedule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY schedule (id, title, start, "end", event_status) FROM stdin;
2	Disposal	2016-12-29	2016-12-31	Upcoming
4	Inventory	2016-11-29	2016-11-30	Upcoming
\.


--
-- Name: schedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('schedule_id_seq', 4, true);


--
-- Data for Name: spmo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY spmo (username, password, email, md5) FROM stdin;
sbmagdadaro	$1$PAcP79MF$7fFZIJDXXE6W3TFQOmROb1	romz.delossantos@gmail.com	4a72d48f3a4be95b3504f79d6af5133e
jrdelgado	$1$3tt1APEN$cfvkNR2LD1uDTnCTEkwdg0	jayvmonterozo@gmail.com	6be3edce907fda705e6b2085c5a423df
\.


--
-- Data for Name: spmo_staff_assignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY spmo_staff_assignment (inventory_id, inventory_office, spmo_assigned) FROM stdin;
4	1	jrdelgado
4	2	sbmagdadaro
4	3	jrdelgado
4	4	jrdelgado
4	5	sbmagdadaro
4	6	sbmagdadaro
4	7	jrdelgado
4	8	sbmagdadaro
4	9	sbmagdadaro
4	10	sbmagdadaro
4	11	jrdelgado
4	12	sbmagdadaro
4	13	jrdelgado
4	14	sbmagdadaro
4	15	jrdelgado
4	16	sbmagdadaro
4	17	jrdelgado
4	18	sbmagdadaro
4	19	sbmagdadaro
4	20	jrdelgado
4	21	sbmagdadaro
4	22	sbmagdadaro
4	23	jrdelgado
4	24	sbmagdadaro
4	25	sbmagdadaro
4	26	jrdelgado
4	27	sbmagdadaro
4	28	jrdelgado
4	29	sbmagdadaro
4	30	jrdelgado
4	31	sbmagdadaro
4	32	jrdelgado
4	33	sbmagdadaro
4	34	jrdelgado
4	35	sbmagdadaro
4	36	sbmagdadaro
4	37	jrdelgado
4	38	jrdelgado
4	39	sbmagdadaro
4	40	jrdelgado
4	41	sbmagdadaro
4	42	sbmagdadaro
4	43	sbmagdadaro
4	44	jrdelgado
4	45	jrdelgado
4	46	jrdelgado
4	47	sbmagdadaro
4	48	sbmagdadaro
4	49	jrdelgado
4	50	jrdelgado
4	51	jrdelgado
4	52	jrdelgado
4	53	jrdelgado
4	54	sbmagdadaro
4	55	sbmagdadaro
4	56	sbmagdadaro
4	57	sbmagdadaro
4	58	jrdelgado
4	59	sbmagdadaro
4	60	jrdelgado
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY staff (office_id, staff_id, first_name, middle_init, last_name, role) FROM stdin;
1	jklepiten	Jannette	K	Lepiten	Clerk
4	mnmacasil	Ma Alena	N	Macasil	Clerk
6	pptudtud	Palmy	P	Tudtud	Clerk
14	mjmatero	Marie Jane	J	Matero	Clerk
15	tgtan	Tiffany Adelaine	G	Tan	Clerk
16	abbascon	Albert	B	Bascon	Clerk
17	rcbinagatan	Rita	C	Binagatan	Clerk
18	yrorillo	Yuleta	R	Orillo	Clerk
20	vmsesaldo	Van Owen	M	Sesaldo	Clerk
44	rrroxas	Robert	R	Roxas	Clerk
22	rmdulaca	Ryan Ciriaco	M	Dulaca	Clerk
23	hbespiritu	Henry Francis	B	Espiritu	Clerk
25	lsdee	Lorel	S	Dee	Clerk
27	eobensig	Eukene	O	Bensig	Clerk
26	rpbayawa	Rebecca	P	Bayawa	Clerk
60	jegumalal	Jeraline	E	Gumalal	Clerk
28	fcabad	Francis Michael	C	Abad	Clerk
29	mcpedrano	Mylah	R	Pedrano	Clerk
54	sbmagdadaro	Stineli	B	Magdadaro	SPMO
6	bfespiritu	Belinda	F	Espiritu	Clerk
6	demontera	Dennis	E	Montera	Clerk
6	jcpinzon	Jocelyn	C	Pinzon	Clerk
6	rrfernandez	Raymond	L	Fernandez	Clerk
16	lgpilapil	Leo Allan	G	Pilapil	Clerk
54	jrdelgado	Jenny	R	Delgado	SPMO
9	fmaglangit	Flor	A	Maglangit	Checker
4	rbasadre	Robert	B	Basadre	Checker
2	prallos	Pat	C	Rallos	Checker
2	fladay	Francis Louie	D	Aday	Checker
\.


--
-- Data for Name: transaction_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY transaction_log (transaction_no, staff_id, transaction_date, transaction_time, transaction_details, equip_qrcode) FROM stdin;
5	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	9b9f95bf74798c23c71e69445d2c53d3
6	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	f4d9387dec63ae41d4b40a146e759a72
7	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	4942d5cf1f14e94afa9aaf45dee2b9db
8	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	df4fb1d4cc775da225d5c5e70143e44d
9	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	42ec8f73f8d06c8cbe768098a3103ab3
10	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	1df728af01ada2c39964d0657159801f
11	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	98b2a70939d90bf9722d84bc4f97bb47
12	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	ef58f7ffe086514aa0164c7fc4f6cea8
13	sbmagdadaro	2016-11-25	17:30:14.423016	updated an equipment	620d7bfbd5e59107057824ca9dbaf6b8
14	sbmagdadaro	2016-11-25	17:33:07.731907	updated an equipment	f4d9387dec63ae41d4b40a146e759a72
15	sbmagdadaro	2016-11-25	17:33:07.854662	updated an equipment	1df728af01ada2c39964d0657159801f
16	sbmagdadaro	2016-11-25	17:37:56.834925	added an equipment	56775887921d4847aff58167bcdc1150
17	sbmagdadaro	2016-11-25	17:37:57.054408	added an equipment	6a14a740d22dc687d749167c3325d776
18	sbmagdadaro	2016-11-25	17:40:05.770547	created a schedule	\N
19	sbmagdadaro	2016-11-28	00:03:24.928138	created a schedule	\N
20	sbmagdadaro	2016-11-28	00:05:35.612377	removed a schedule	\N
21	sbmagdadaro	2016-11-28	00:06:00.73894	created a schedule	\N
22	sbmagdadaro	2016-11-28	00:07:11.784579	removed a schedule	\N
23	sbmagdadaro	2016-11-28	00:07:42.410861	created a schedule	\N
24	sbmagdadaro	2016-11-28	06:32:17.358154	created a schedule	\N
25	sbmagdadaro	2016-11-28	06:34:50.391515	removed a schedule	\N
26	sbmagdadaro	2016-11-28	06:36:53.325987	created a schedule	\N
27	sbmagdadaro	2016-11-28	06:54:44.739845	created a schedule	\N
28	sbmagdadaro	2016-11-28	06:58:09.469658	removed a schedule	\N
29	sbmagdadaro	2016-11-28	06:58:35.711351	removed a schedule	\N
30	sbmagdadaro	2016-11-28	07:17:56.716128	created a schedule	\N
31	sbmagdadaro	2016-11-28	07:21:13.019223	removed a schedule	\N
32	sbmagdadaro	2016-11-28	07:22:34.526878	created a schedule	\N
33	sbmagdadaro	2016-11-28	07:24:06.349255	removed a schedule	\N
34	sbmagdadaro	2016-11-28	07:25:12.971351	created a schedule	\N
35	sbmagdadaro	2016-11-28	08:33:23.418185	removed a schedule	\N
36	sbmagdadaro	2016-11-28	08:34:38.055651	created a schedule	\N
37	sbmagdadaro	2016-11-28	08:59:35.821561	created a schedule	\N
38	sbmagdadaro	2016-11-28	09:03:10.16815	created a schedule	\N
39	sbmagdadaro	2016-11-28	09:04:32.079212	created a schedule	\N
40	sbmagdadaro	2016-11-28	09:05:41.753955	created a schedule	\N
41	sbmagdadaro	2016-11-28	09:19:33.568214	created a schedule	\N
42	sbmagdadaro	2016-11-28	09:20:32.52165	created a schedule	\N
43	sbmagdadaro	2016-11-28	09:23:24.09264	created a schedule	\N
44	sbmagdadaro	2016-11-28	09:27:02.748448	created a schedule	\N
45	sbmagdadaro	2016-11-28	09:35:29.222453	removed a schedule	\N
46	sbmagdadaro	2016-11-28	09:35:43.517801	removed a schedule	\N
47	sbmagdadaro	2016-11-28	09:35:47.706495	removed a schedule	\N
48	sbmagdadaro	2016-11-28	09:35:56.778256	removed a schedule	\N
49	sbmagdadaro	2016-11-28	09:36:03.492599	removed a schedule	\N
50	sbmagdadaro	2016-11-28	09:36:28.640785	removed a schedule	\N
51	sbmagdadaro	2016-11-28	09:36:40.837566	removed a schedule	\N
52	sbmagdadaro	2016-11-28	09:37:03.937249	removed a schedule	\N
53	sbmagdadaro	2016-11-28	09:37:13.02285	removed a schedule	\N
54	sbmagdadaro	2016-11-28	09:38:49.138299	created a schedule	\N
55	sbmagdadaro	2016-11-28	09:41:16.008068	removed a schedule	\N
56	sbmagdadaro	2016-11-28	09:45:06.356867	created a schedule	\N
57	sbmagdadaro	2016-11-28	09:50:52.077804	removed a schedule	\N
58	sbmagdadaro	2016-11-28	09:52:20.663555	created a schedule	\N
59	sbmagdadaro	2016-11-28	10:17:54.166387	updated an equipment	56775887921d4847aff58167bcdc1150
60	sbmagdadaro	2016-11-28	10:47:25.890634	created a schedule	\N
61	sbmagdadaro	2016-11-28	10:50:22.292803	removed a schedule	\N
62	sbmagdadaro	2016-11-28	10:50:51.418908	created a schedule	\N
63	sbmagdadaro	2016-11-28	10:54:15.202192	updated a schedule	\N
64	sbmagdadaro	2016-11-28	10:54:30.716107	updated a schedule	\N
65	sbmagdadaro	2016-11-28	11:08:30.817704	updated an equipment	6a14a740d22dc687d749167c3325d776
66	sbmagdadaro	2016-11-28	11:28:20.406747	updated a schedule	\N
67	sbmagdadaro	2016-11-28	11:36:16.720913	removed a schedule	\N
70	jrdelgado	2016-11-28	11:49:15.877528	added an equipment	7f7959e1567f278cff8c64602c15f494
71	jrdelgado	2016-11-28	11:49:15.900279	added an equipment	e67981d241ad5e29f4420a6f4ef2b7cb
72	jrdelgado	2016-11-28	11:49:15.906399	added an equipment	70c8f994a37f42dc783d951ffaa80ef8
73	jrdelgado	2016-11-28	11:49:15.91623	added an equipment	654784daf0b133e42d02214b22cb03a6
74	jrdelgado	2016-11-28	11:49:15.921868	added an equipment	38be5418a8e2601443030c8cba989324
75	jrdelgado	2016-11-28	11:49:15.950072	added an equipment	af78d2a38e4953c40fe70c54195c83b3
76	sbmagdadaro	2016-11-28	13:59:22.524369	disposed an equipment	654784daf0b133e42d02214b22cb03a6
77	sbmagdadaro	2016-11-28	14:27:36.714455	moved an equipment	56775887921d4847aff58167bcdc1150
80	sbmagdadaro	2016-11-28	14:49:54.516603	moved an equipment	7813d1590d28a7dd372ad54b5d29d033
81	sbmagdadaro	2016-11-28	15:18:08.594608	removed a schedule	\N
82	sbmagdadaro	2016-11-28	15:18:08.594608	removed a schedule	\N
83	sbmagdadaro	2016-11-28	15:18:08.594608	removed a schedule	\N
84	sbmagdadaro	2016-11-28	15:19:37.246034	created a schedule	\N
85	sbmagdadaro	2016-11-28	15:20:02.314999	removed a schedule	\N
86	sbmagdadaro	2016-11-28	15:59:03.613968	created a schedule	\N
87	sbmagdadaro	2016-11-28	16:17:10.977565	moved an equipment	7813d1590d28a7dd372ad54b5d29d033
88	sbmagdadaro	2016-11-28	16:22:08.407087	moved an equipment	ef58f7ffe086514aa0164c7fc4f6cea8
90	sbmagdadaro	2016-11-28	16:44:58.246262	created a schedule	\N
91	sbmagdadaro	2016-11-28	16:45:08.480755	removed a schedule	\N
92	sbmagdadaro	2016-11-28	16:47:46.680317	moved an equipment	56775887921d4847aff58167bcdc1150
93	sbmagdadaro	2016-11-28	17:16:49.933141	created a schedule	\N
94	sbmagdadaro	2016-11-28	17:31:12.963834	moved an equipment	dbc4d84bfcfe2284ba11beffb853a8c4
95	sbmagdadaro	2016-11-29	17:34:28.745687	updated a schedule	\N
98	sbmagdadaro	2016-11-28	17:50:02.205889	updated a schedule	\N
99	sbmagdadaro	2016-11-28	17:50:02.205889	updated a schedule	\N
\.


--
-- Name: transaction_log_transaction_no_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('transaction_log_transaction_no_seq', 99, true);


--
-- Data for Name: working_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY working_equipment (qrcode, date_last_inventoried, status) FROM stdin;
969d53a568dfbaf6bb929d69917b34fa	\N	Found
67107e5f6f1efb4409c37abd1645b0f5	\N	Found
02fd6cf9553be2d58efe687b857830f6	\N	Found
a127c5a2ed0a7a7790327f59706b0b77	\N	Found
f752167fca2ecaf38964ffaff639b8d8	\N	Found
69c4bb19e942fea086d5fd85078695a0	\N	Found
9b9f95bf74798c23c71e69445d2c53d3	\N	Found
4942d5cf1f14e94afa9aaf45dee2b9db	\N	Found
df4fb1d4cc775da225d5c5e70143e44d	\N	Found
98b2a70939d90bf9722d84bc4f97bb47	\N	Found
ef58f7ffe086514aa0164c7fc4f6cea8	\N	Found
620d7bfbd5e59107057824ca9dbaf6b8	\N	Found
983c25c7ee9644953077c7f3cb15a8db	\N	Found
7f7959e1567f278cff8c64602c15f494	\N	Found
e67981d241ad5e29f4420a6f4ef2b7cb	\N	Found
70c8f994a37f42dc783d951ffaa80ef8	\N	Found
38be5418a8e2601443030c8cba989324	\N	Found
af78d2a38e4953c40fe70c54195c83b3	\N	Found
7813d1590d28a7dd372ad54b5d29d033	\N	Found
dbc4d84bfcfe2284ba11beffb853a8c4	\N	Found
\.


--
-- Name: assigned_to_equipment_qr_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assigned_to
    ADD CONSTRAINT assigned_to_equipment_qr_code_key UNIQUE (equipment_qr_code);


--
-- Name: assigned_to_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assigned_to
    ADD CONSTRAINT assigned_to_pkey PRIMARY KEY (equipment_qr_code, office_id_holder);


--
-- Name: checker_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY checker
    ADD CONSTRAINT checker_email_key UNIQUE (email);


--
-- Name: checker_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY checker
    ADD CONSTRAINT checker_pkey PRIMARY KEY (username);


--
-- Name: clerk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clerk
    ADD CONSTRAINT clerk_pkey PRIMARY KEY (username);


--
-- Name: disposal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY disposal_requests
    ADD CONSTRAINT disposal_requests_pkey PRIMARY KEY (id);


--
-- Name: disposed_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY disposed_equipment
    ADD CONSTRAINT disposed_equipment_pkey PRIMARY KEY (qrcode);


--
-- Name: dummy_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY dummy_transaction
    ADD CONSTRAINT dummy_transaction_pkey PRIMARY KEY (trans_num);


--
-- Name: equipment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY equipment_history
    ADD CONSTRAINT equipment_history_pkey PRIMARY KEY (record_no);


--
-- Name: equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (qrcode);


--
-- Name: inventory_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY inventory_details
    ADD CONSTRAINT inventory_details_pkey PRIMARY KEY (inventory_id);


--
-- Name: mobile_trans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY mobile_trans
    ADD CONSTRAINT mobile_trans_pkey PRIMARY KEY (id);


--
-- Name: office_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY office
    ADD CONSTRAINT office_email_key UNIQUE (email);


--
-- Name: office_office_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY office
    ADD CONSTRAINT office_office_name_key UNIQUE (office_name);


--
-- Name: office_password_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY office
    ADD CONSTRAINT office_password_key UNIQUE (password);


--
-- Name: office_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY office
    ADD CONSTRAINT office_pkey PRIMARY KEY (office_id);


--
-- Name: schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY schedule
    ADD CONSTRAINT schedule_pkey PRIMARY KEY (id);


--
-- Name: spmo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY spmo
    ADD CONSTRAINT spmo_pkey PRIMARY KEY (username);


--
-- Name: spmo_staff_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY spmo_staff_assignment
    ADD CONSTRAINT spmo_staff_assignment_pkey PRIMARY KEY (inventory_id, inventory_office);


--
-- Name: staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (office_id, staff_id);


--
-- Name: staff_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY staff
    ADD CONSTRAINT staff_staff_id_key UNIQUE (staff_id);


--
-- Name: transaction_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY transaction_log
    ADD CONSTRAINT transaction_log_pkey PRIMARY KEY (transaction_no);


--
-- Name: uniquestaff; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY staff
    ADD CONSTRAINT uniquestaff UNIQUE (staff_id);


--
-- Name: working_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY working_equipment
    ADD CONSTRAINT working_equipment_pkey PRIMARY KEY (qrcode);


--
-- Name: check_assignment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_assignment BEFORE INSERT ON assigned_to FOR EACH ROW EXECUTE PROCEDURE check_insert_assigned_to();


--
-- Name: check_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_inventory BEFORE INSERT ON inventory_details FOR EACH ROW EXECUTE PROCEDURE check_insert_inventory_details();


--
-- Name: check_startdate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_startdate BEFORE INSERT ON schedule FOR EACH ROW EXECUTE PROCEDURE valid_start();


--
-- Name: create_equip_transaction; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_equip_transaction AFTER INSERT OR UPDATE ON assigned_to FOR EACH ROW EXECUTE PROCEDURE new_assignment();


--
-- Name: create_sched_transaction; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_sched_transaction AFTER INSERT OR DELETE OR UPDATE ON schedule FOR EACH ROW EXECUTE PROCEDURE new_sched_transaction();


--
-- Name: detect_clerk; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER detect_clerk AFTER INSERT ON staff FOR EACH ROW EXECUTE PROCEDURE auto_insert_clerk_roles();


--
-- Name: encrypt_qrcode; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER encrypt_qrcode BEFORE INSERT ON equipment FOR EACH ROW EXECUTE PROCEDURE encryptqr();


--
-- Name: insert_working; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER insert_working AFTER INSERT ON equipment FOR EACH ROW EXECUTE PROCEDURE auto_ins_working();


--
-- Name: assigned_to_equipment_qr_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assigned_to
    ADD CONSTRAINT assigned_to_equipment_qr_code_fkey FOREIGN KEY (equipment_qr_code) REFERENCES equipment(qrcode) ON DELETE CASCADE;


--
-- Name: assigned_to_office_id_holder_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assigned_to
    ADD CONSTRAINT assigned_to_office_id_holder_fkey FOREIGN KEY (office_id_holder) REFERENCES office(office_id) ON DELETE CASCADE;


--
-- Name: assigned_to_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assigned_to
    ADD CONSTRAINT assigned_to_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(staff_id);


--
-- Name: checker_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY checker
    ADD CONSTRAINT checker_username_fkey FOREIGN KEY (username) REFERENCES staff(staff_id) ON DELETE CASCADE;


--
-- Name: clerk_designated_office_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clerk
    ADD CONSTRAINT clerk_designated_office_fkey FOREIGN KEY (designated_office) REFERENCES office(office_id);


--
-- Name: clerk_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clerk
    ADD CONSTRAINT clerk_username_fkey FOREIGN KEY (username) REFERENCES staff(staff_id) ON DELETE CASCADE;


--
-- Name: disposal_requests_office_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY disposal_requests
    ADD CONSTRAINT disposal_requests_office_name_fkey FOREIGN KEY (office_name) REFERENCES office(office_name);


--
-- Name: disposal_requests_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY disposal_requests
    ADD CONSTRAINT disposal_requests_username_fkey FOREIGN KEY (username) REFERENCES staff(staff_id);


--
-- Name: disposed_equipment_qrcode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY disposed_equipment
    ADD CONSTRAINT disposed_equipment_qrcode_fkey FOREIGN KEY (qrcode) REFERENCES equipment(qrcode) ON DELETE CASCADE;


--
-- Name: equipment_history_equip_qrcode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY equipment_history
    ADD CONSTRAINT equipment_history_equip_qrcode_fkey FOREIGN KEY (equip_qrcode) REFERENCES equipment(qrcode);


--
-- Name: equipment_history_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY equipment_history
    ADD CONSTRAINT equipment_history_office_id_fkey FOREIGN KEY (office_id) REFERENCES office(office_id);


--
-- Name: equipment_history_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY equipment_history
    ADD CONSTRAINT equipment_history_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(staff_id);


--
-- Name: inventory_details_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY inventory_details
    ADD CONSTRAINT inventory_details_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES spmo(username) ON DELETE CASCADE;


--
-- Name: inventory_details_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY inventory_details
    ADD CONSTRAINT inventory_details_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES schedule(id) ON DELETE CASCADE;


--
-- Name: spmo_staff_assignment_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY spmo_staff_assignment
    ADD CONSTRAINT spmo_staff_assignment_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES inventory_details(inventory_id) ON DELETE CASCADE;


--
-- Name: spmo_staff_assignment_inventory_office_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY spmo_staff_assignment
    ADD CONSTRAINT spmo_staff_assignment_inventory_office_fkey FOREIGN KEY (inventory_office) REFERENCES office(office_id) ON DELETE CASCADE;


--
-- Name: spmo_staff_assignment_spmo_assigned_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY spmo_staff_assignment
    ADD CONSTRAINT spmo_staff_assignment_spmo_assigned_fkey FOREIGN KEY (spmo_assigned) REFERENCES spmo(username) ON DELETE CASCADE;


--
-- Name: spmo_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY spmo
    ADD CONSTRAINT spmo_username_fkey FOREIGN KEY (username) REFERENCES staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY staff
    ADD CONSTRAINT staff_office_id_fkey FOREIGN KEY (office_id) REFERENCES office(office_id);


--
-- Name: transaction_log_equip_qrcode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY transaction_log
    ADD CONSTRAINT transaction_log_equip_qrcode_fkey FOREIGN KEY (equip_qrcode) REFERENCES equipment(qrcode) ON DELETE SET NULL;


--
-- Name: transaction_log_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY transaction_log
    ADD CONSTRAINT transaction_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL;


--
-- Name: working_equipment_qrcode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY working_equipment
    ADD CONSTRAINT working_equipment_qrcode_fkey FOREIGN KEY (qrcode) REFERENCES equipment(qrcode) ON DELETE CASCADE;


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: office; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE office FROM PUBLIC;
REVOKE ALL ON TABLE office FROM postgres;
GRANT ALL ON TABLE office TO postgres;
GRANT SELECT,INSERT ON TABLE office TO client;


--
-- PostgreSQL database dump complete
--

